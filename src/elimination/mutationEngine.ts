/**
 * Mutation Engine
 * Generates improved strategy prompts for eliminated agents
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { loadConfig, getRootDir } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import { createAgent } from '../signals/signalDb.js';

/**
 * Generate a mutated strategy prompt for a replacement agent
 */
export async function mutateAgent(
  eliminatedAgentId: string,
  strategy: string,
  originalPrompt: string,
  performance: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    lossPatterns: string;
  }
): Promise<{ newAgentId: string; newPrompt: string }> {
  const config = loadConfig();
  const logger = getLogger();
  const rootDir = getRootDir();

  logger.info({
    msg: '🧬 Mutation engine starting',
    eliminatedAgent: eliminatedAgentId,
    strategy,
  });

  // Build mutation prompt
  const mutationPrompt = buildMutationPrompt(strategy, originalPrompt, performance);

  // Generate new prompt via qwen CLI
  const newPrompt = await generatePromptViaQwen(mutationPrompt, config.elimination.mutationModel);

  // Generate new agent ID
  const version = getNextVersion(eliminatedAgentId);
  const newAgentId = `${eliminatedAgentId}-v${version}`;

  // Save new prompt file
  const promptFile = saveMutationPrompt(newAgentId, strategy, newPrompt);

  // Create new agent in DB
  await createAgent(newAgentId, strategy, promptFile, config.elimination.mutationModel, eliminatedAgentId);

  logger.info({
    msg: 'New agent deployed',
    newAgentId,
    strategy,
    version,
  });

  return { newAgentId, newPrompt };
}

/**
 * Build the mutation prompt template
 */
function buildMutationPrompt(
  strategy: string,
  originalPrompt: string,
  performance: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    lossPatterns: string;
  }
): string {
  return `You are a trading strategy optimizer.

The following agent was eliminated due to underperformance:
Strategy: ${strategy}
Original Prompt: ${originalPrompt}
Week Stats: Win Rate ${performance.winRate}%, Profit Factor ${performance.profitFactor}, Max DD ${performance.maxDrawdown}%
Common Loss Patterns: ${performance.lossPatterns}

Generate an improved version of this strategy prompt that:
1. Keeps the core strategy concept (${strategy})
2. Adds stricter entry filters to reduce false signals
3. Adjusts SL placement logic if drawdown was the issue
4. Adds at least one new confluence requirement
5. Maintains the same JSON output format (Signal JSON or NO_SIGNAL)

Return ONLY the new system prompt text. Do not include any explanation or markdown.`;
}

/**
 * Generate improved prompt via qwen CLI
 */
async function generatePromptViaQwen(prompt: string, model: string): Promise<string> {
  const logger = getLogger();
  const cliPath = process.env.AI_CLI_PATH || 'qwen';
  const timeout = 60000; // 60s for prompt generation

  logger.info({ msg: 'Generating mutation prompt via qwen CLI', model });

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Mutation prompt generation timed out'));
    }, timeout);

    const args = [
      '-p',
      prompt,
      '--model',
      model,
      '--approval-mode',
      'yolo',
    ];

    const child = spawn(cliPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code === 0 && stdout) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Qwen CLI exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Save the mutation prompt as a JSON file
 */
function saveMutationPrompt(agentId: string, strategy: string, prompt: string): string {
  const rootDir = getRootDir();
  const promptsDir = join(rootDir, 'src', 'agents', 'prompts');

  if (!existsSync(promptsDir)) {
    mkdirSync(promptsDir, { recursive: true });
  }

  const fileName = `${agentId.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
  const filePath = join(promptsDir, fileName);

  const promptData = {
    version: '1.0',
    strategy,
    description: `Mutated from ${agentId}`,
    systemPrompt: prompt,
  };

  writeFileSync(filePath, JSON.stringify(promptData, null, 2), 'utf-8');

  return fileName;
}

/**
 * Get the next version number for a mutated agent
 */
function getNextVersion(originalAgentId: string): number {
  // Parse existing version from agent ID (e.g., AGENT-01-v2 → 3)
  const versionMatch = originalAgentId.match(/-v(\d+)$/);
  if (versionMatch) {
    return parseInt(versionMatch[1], 10) + 1;
  }
  return 2; // First mutation = v2
}
