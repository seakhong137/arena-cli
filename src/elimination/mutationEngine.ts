/**
 * Mutation Engine
 * Generates improved strategy prompts for eliminated agents
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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

  // Generate new prompt via Gemini API
  const newPrompt = await generatePromptViaGemini(mutationPrompt, config.elimination.mutationModel);

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
 * Generate improved prompt via Gemini API
 */
async function generatePromptViaGemini(prompt: string, model: string): Promise<string> {
  const logger = getLogger();
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  
  const geminiModel = model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const timeout = 60000; // 60s for prompt generation

  logger.info({ msg: 'Generating mutation prompt via Gemini API', model: geminiModel });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({ model: geminiModel });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const result = await gemini.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    clearTimeout(timeoutId);
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Mutation prompt generation timed out');
    }
    throw error;
  }
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
