/**
 * Weekly Elimination Engine
 * Scores agents, ranks by composite score, flags bottom performer
 */

import { loadConfig } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import { getAllAgents, updateAgentStatus } from '../signals/signalDb.js';
import type { WeeklyPerformance, EliminationRecord } from '../shared/types.js';
import { randomUUID } from 'crypto';

/**
 * Run the weekly elimination cycle
 */
export async function runEliminationCycle(): Promise<{
  eliminatedAgent?: string;
  newAgentId?: string;
}> {
  const config = loadConfig();
  const logger = getLogger();

  logger.info('⚔️ Weekly elimination cycle starting...');

  // Step 1: Get all active agents
  const agents = await getAllAgents();
  logger.info({ msg: 'Active agents', count: agents.length });

  // Step 2: Calculate performance for each agent
  const performances: WeeklyPerformance[] = [];

  for (const agent of agents) {
    // TODO: Query signals from past 7 days and calculate metrics
    // For now, use placeholder
    const perf: WeeklyPerformance = {
      agentId: agent.id,
      weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      weekEnd: new Date(),
      totalSignals: 0,
      wins: 0,
      losses: 0,
      expired: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      avgRR: 0,
      compositeScore: 0,
      status: 'HEALTHY',
    };

    performances.push(perf);
  }

  // Step 3: Check minimum signal requirement
  const eligibleAgents = performances.filter(
    (p) => p.totalSignals >= config.elimination.minWeeklySignals
  );

  const exemptAgents = performances.filter(
    (p) => p.totalSignals < config.elimination.minWeeklySignals
  );

  logger.info({
    msg: 'Elimination eligibility',
    eligible: eligibleAgents.length,
    exempt: exemptAgents.length,
    reason: 'Insufficient signals',
  });

  if (eligibleAgents.length === 0) {
    logger.info('No agents eligible for elimination — insufficient data');
    return {};
  }

  // Step 4: Score and rank agents
  const scoredAgents = eligibleAgents.map((perf) => ({
    ...perf,
    compositeScore: calculateCompositeScore(perf, config),
    status: getAgentStatus(perf, config),
  }));

  // Sort by composite score (lowest = worst)
  scoredAgents.sort((a, b) => a.compositeScore - b.compositeScore);

  // Step 5: Flag worst performer
  const worstAgent = scoredAgents[0];

  if (
    worstAgent.winRate < config.elimination.winRateThreshold ||
    worstAgent.profitFactor < config.elimination.profitFactorThreshold ||
    worstAgent.maxDrawdown > config.elimination.maxDrawdownThreshold
  ) {
    logger.warn({
      msg: 'Agent flagged for elimination',
      agentId: worstAgent.agentId,
      winRate: worstAgent.winRate,
      profitFactor: worstAgent.profitFactor,
      maxDrawdown: worstAgent.maxDrawdown,
      compositeScore: worstAgent.compositeScore,
    });

    // Step 6: Mark as eliminated
    await updateAgentStatus(worstAgent.agentId, 'ELIMINATED');

    // Step 7: Create elimination record
    const record: EliminationRecord = {
      id: randomUUID(),
      agentId: worstAgent.agentId,
      strategy: agents.find((a) => a.id === worstAgent.agentId)?.strategy || 'Unknown',
      weekStart: worstAgent.weekStart,
      weekEnd: worstAgent.weekEnd,
      winRate: worstAgent.winRate,
      profitFactor: worstAgent.profitFactor,
      maxDrawdown: worstAgent.maxDrawdown,
      reason: getEliminationReason(worstAgent, config),
      eliminatedAt: new Date(),
    };

    // TODO: Save elimination record to DB

    logger.info({
      msg: 'Agent eliminated',
      agentId: worstAgent.agentId,
    });

    return { eliminatedAgent: worstAgent.agentId };
  }

  logger.info('No agent breached elimination thresholds this week');
  return {};
}

/**
 * Calculate composite score for ranking
 * Lower score = worse performance
 */
function calculateCompositeScore(
  perf: WeeklyPerformance,
  config: ReturnType<typeof loadConfig>
): number {
  // Normalize each metric to 0-1 scale
  const winRateScore = Math.min(perf.winRate / 100, 1);
  const pfScore = Math.min(perf.profitFactor / 3, 1); // Cap at 3.0 PF
  const ddScore = Math.max(1 - perf.maxDrawdown / config.elimination.maxDrawdownThreshold, 0);

  // Weighted composite (PF and win rate are primary)
  return winRateScore * 0.35 + pfScore * 0.35 + ddScore * 0.3;
}

/**
 * Determine agent status based on performance
 */
function getAgentStatus(
  perf: WeeklyPerformance,
  config: ReturnType<typeof loadConfig>
): 'HEALTHY' | 'WARNING' | 'AT_RISK' {
  if (
    perf.winRate < config.elimination.winRateThreshold ||
    perf.profitFactor < config.elimination.profitFactorThreshold ||
    perf.maxDrawdown > config.elimination.maxDrawdownThreshold
  ) {
    return 'AT_RISK';
  }

  if (
    perf.winRate < config.elimination.winRateThreshold + 10 ||
    perf.profitFactor < config.elimination.profitFactorThreshold + 0.3
  ) {
    return 'WARNING';
  }

  return 'HEALTHY';
}

/**
 * Get human-readable elimination reason
 */
function getEliminationReason(
  perf: WeeklyPerformance,
  config: ReturnType<typeof loadConfig>
): string {
  const reasons: string[] = [];

  if (perf.winRate < config.elimination.winRateThreshold) {
    reasons.push(`Win rate ${perf.winRate.toFixed(1)}% < ${config.elimination.winRateThreshold}%`);
  }
  if (perf.profitFactor < config.elimination.profitFactorThreshold) {
    reasons.push(
      `Profit factor ${perf.profitFactor.toFixed(2)} < ${config.elimination.profitFactorThreshold}`
    );
  }
  if (perf.maxDrawdown > config.elimination.maxDrawdownThreshold) {
    reasons.push(
      `Max drawdown ${perf.maxDrawdown.toFixed(1)}% > ${config.elimination.maxDrawdownThreshold}%`
    );
  }

  return reasons.join('; ');
}
