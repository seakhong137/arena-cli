/**
 * Agent Pool Manager
 * Manages all 10 agents, their configurations, and prompt loading
 */

import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { loadConfig, getRootDir, type AgentDefinition } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import { runAgent } from './agentRunner.js';
import { buildAgentPayload, type PayloadInput } from '../mcp/payloadBuilder.js';
import type { AgentResponse } from '../shared/types.js';

export interface AgentPoolResult {
  agentId: string;
  strategy: string;
  response: AgentResponse;
  responseTimeMs: number;
  error?: string;
}

/**
 * Get all active agent definitions from config
 */
export function getActiveAgents(): AgentDefinition[] {
  const config = loadConfig();
  return config.agents.initial;
}

/**
 * Load a strategy prompt from file
 */
export function loadStrategyPrompt(promptFile: string): string {
  const rootDir = getRootDir();
  const promptPath = join(rootDir, 'src', 'agents', 'prompts', promptFile);

  if (!existsSync(promptPath)) {
    throw new Error(`Strategy prompt not found: ${promptPath}`);
  }

  const raw = readFileSync(promptPath, 'utf-8');
  const config = JSON.parse(raw);

  return config.systemPrompt;
}

/**
 * Run all active agents against the same input data
 * Returns results for each agent
 */
export async function runAllAgents(input: PayloadInput): Promise<AgentPoolResult[]> {
  const logger = getLogger();
  const agents = getActiveAgents();
  const results: AgentPoolResult[] = [];

  logger.info({ msg: `Running ${agents.length} agents...`, asset: input.asset });

  // Run agents sequentially (as per PRD)
  for (const agentDef of agents) {
    try {
      const systemPrompt = loadStrategyPrompt(agentDef.promptFile);
      const payload = buildAgentPayload(input, systemPrompt);

      const result = await runAgent(agentDef.id, payload, agentDef.model);

      results.push({
        agentId: agentDef.id,
        strategy: agentDef.strategy,
        response: result.response,
        responseTimeMs: result.responseTimeMs,
        error: result.error,
      });
    } catch (error: any) {
      logger.error({
        msg: `Agent ${agentDef.id} failed`,
        error: error.message,
      });

      results.push({
        agentId: agentDef.id,
        strategy: agentDef.strategy,
        response: 'NO_SIGNAL',
        responseTimeMs: 0,
        error: error.message,
      });
    }
  }

  const signalCount = results.filter((r) => r.response !== 'NO_SIGNAL').length;
  logger.info({
    msg: 'All agents complete',
    totalAgents: agents.length,
    signalsGenerated: signalCount,
    noSignals: agents.length - signalCount,
  });

  return results;
}
