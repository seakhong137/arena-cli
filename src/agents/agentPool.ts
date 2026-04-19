/**
 * Agent Pool Manager
 * Manages all 5 agents, their configurations, and prompt loading
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
export async function runAllAgents(input: PayloadInput, verbose = false, maxAgents?: number): Promise<AgentPoolResult[]> {
  const logger = getLogger();
  const allAgents = getActiveAgents();
  const agents = maxAgents ? allAgents.slice(0, maxAgents) : allAgents;
  const results: AgentPoolResult[] = [];

  logger.info({ msg: `Running ${agents.length} agents...`, asset: input.asset, verbose, maxAgents });

  if (verbose) {
    logger.info({
      msg: 'Payload preview',
      ohlcvCount: input.ohlcv?.length || 0,
      hasQuote: !!input.quote,
    });
  }

  // Run agents sequentially with delay to avoid API rate limiting
  for (let i = 0; i < agents.length; i++) {
    const agentDef = agents[i];
    try {
      const systemPrompt = loadStrategyPrompt(agentDef.promptFile);
      const payload = buildAgentPayload(input, systemPrompt);

      const result = await runAgent(agentDef.id, payload, agentDef.model, undefined, verbose);

      results.push({
        agentId: agentDef.id,
        strategy: agentDef.strategy,
        response: result.response,
        responseTimeMs: result.responseTimeMs,
        error: result.error,
      });

      if (verbose) {
        logger.info({
          msg: `${agentDef.strategy} result`,
          response: typeof result.response === 'string' ? result.response : JSON.stringify(result.response).substring(0, 200),
          rawOutput: result.rawOutput?.substring(0, 300) || '(none)',
        });
      }

      // Add delay between agents to avoid API rate limiting (skip after last agent)
      if (i < agents.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
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
