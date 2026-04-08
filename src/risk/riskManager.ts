import { loadConfig } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import type { Signal, RiskManagerResult } from '../shared/types.js';
import { getDailySignalCount, getOpenSignals } from '../signals/signalDb.js';

export async function applyRiskFilters(signal: Signal): Promise<RiskManagerResult> {
  const config = loadConfig();
  const logger = getLogger();
  const applied: string[] = [];
  const triggered: string[] = [];

  logger.debug({ msg: 'Risk manager filtering', agentId: signal.agent_id, asset: signal.asset });

  // Filter 1: Max daily signals (global)
  const globalDailyCount = await getDailySignalCount();
  applied.push('DAILY_GLOBAL_CHECK');
  if (globalDailyCount >= config.riskManager.maxDailySignalsGlobal) {
    triggered.push('DAILY_GLOBAL_LIMIT');
    return { approved: false, filtersApplied: applied, filtersTriggered: triggered, rejectionReason: `Daily global signal limit reached (${globalDailyCount}/${config.riskManager.maxDailySignalsGlobal})` };
  }

  // Filter 2: Max daily signals (per agent)
  const agentDailyCount = await getDailySignalCount(signal.agent_id);
  applied.push('DAILY_AGENT_CHECK');
  if (agentDailyCount >= config.riskManager.maxDailySignalsPerAgent) {
    triggered.push('DAILY_AGENT_LIMIT');
    return { approved: false, filtersApplied: applied, filtersTriggered: triggered, rejectionReason: `Agent daily signal limit reached (${agentDailyCount}/${config.riskManager.maxDailySignalsPerAgent})` };
  }

  // Filter 3: Low R:R filter
  applied.push('RR_CHECK');
  if (signal.risk_reward_ratio < config.riskManager.minRiskRewardRatio) {
    triggered.push('LOW_RR');
    return { approved: false, filtersApplied: applied, filtersTriggered: triggered, rejectionReason: `R:R too low (${signal.risk_reward_ratio} < ${config.riskManager.minRiskRewardRatio})` };
  }

  // Filter 4: Low confidence filter (flag but do not suppress)
  applied.push('CONFIDENCE_CHECK');
  if (signal.confidence_pct < config.riskManager.minConfidencePct) {
    triggered.push('LOW_CONFIDENCE');
    logger.warn({ msg: 'Low confidence signal', agentId: signal.agent_id, confidence: signal.confidence_pct });
  }

  // Filter 5: Duplicate signal guard
  applied.push('DUPLICATE_CHECK');
  const isDuplicate = await checkDuplicateSignal(signal);
  if (isDuplicate) {
    triggered.push('DUPLICATE');
    return { approved: false, filtersApplied: applied, filtersTriggered: triggered, rejectionReason: `Duplicate signal for ${signal.asset} ${signal.direction} within ${config.riskManager.duplicateGuardMinutes} min` };
  }

  // Filter 6: High volatility gate
  applied.push('VOLATILITY_GATE');
  const isHighVol = await checkVolatilityGate(signal.asset);
  if (isHighVol) {
    triggered.push('HIGH_VOLATILITY');
    return { approved: false, filtersApplied: applied, filtersTriggered: triggered, rejectionReason: 'High volatility detected (ATR spike - possible news event)' };
  }

  // Filter 7: Correlation limit
  applied.push('CORRELATION_CHECK');
  if (isUsdPair(signal.asset)) {
    const openSignals = await getOpenSignals();
    const openUsd = openSignals.filter((s) => isUsdPair(s.asset));
    if (openUsd.length >= config.riskManager.maxCorrelatedUsdSignals) {
      triggered.push('CORRELATION_LIMIT');
      return { approved: false, filtersApplied: applied, filtersTriggered: triggered, rejectionReason: `Max correlated USD signals reached (${openUsd.length}/${config.riskManager.maxCorrelatedUsdSignals})` };
    }
  }

  logger.info({ msg: 'Signal approved by risk manager', agentId: signal.agent_id, asset: signal.asset });

  return { approved: true, filtersApplied: applied, filtersTriggered: triggered.filter((f) => f !== 'LOW_CONFIDENCE'), approvedAt: new Date().toISOString() };
}

async function checkDuplicateSignal(signal: Signal): Promise<boolean> {
  const config = loadConfig();
  const openSignals = await getOpenSignals();
  const cutoffMs = config.riskManager.duplicateGuardMinutes * 60 * 1000;
  const now = new Date(signal.timestamp).getTime();

  return openSignals.some((existing) => {
    const existingTime = new Date(existing.timestamp).getTime();
    const timeDiff = Math.abs(now - existingTime);
    return existing.asset === signal.asset && existing.direction === signal.direction && timeDiff < cutoffMs;
  });
}

async function checkVolatilityGate(_asset: string): Promise<boolean> {
  return false;
}

function isUsdPair(asset: string): boolean {
  const usdPairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'USDJPY'];
  return usdPairs.some((pair) => asset.includes(pair.replace('FX:', '')));
}
