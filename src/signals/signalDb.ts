import { getDb } from './db.js';
import { signals, agents, weeklyPerformance, eliminationRecords, scanCycles } from './schema.js';
import { eq, desc, gte, and, count, avg, sum } from 'drizzle-orm';
import type { Signal, SignalOutcome, WeeklyPerformance, EliminationRecord, ScanCycleResult } from '../shared/types.js';
import { randomUUID } from 'crypto';

// ── Signal Repository ──────────────────────────────

export async function saveSignal(signal: Signal): Promise<string> {
  const db = getDb();
  const id = randomUUID();

  await db.insert(signals).values({
    id,
    agentId: signal.agent_id,
    strategy: signal.strategy,
    asset: signal.asset,
    timeframe: signal.timeframe,
    direction: signal.direction,
    entry: signal.entry,
    stopLoss: signal.stop_loss,
    takeProfit1: signal.take_profit_1,
    takeProfit2: signal.take_profit_2,
    riskRewardRatio: signal.risk_reward_ratio,
    positionSizePct: signal.position_size_pct,
    confidencePct: signal.confidence_pct,
    session: signal.session,
    rationale: signal.rationale,
    invalidation: signal.invalidation,
    status: signal.status,
    timestamp: new Date(signal.timestamp),
  });

  return id;
}

export async function updateSignalStatus(
  signalId: string,
  status: 'OPEN' | 'TP_HIT' | 'SL_HIT' | 'EXPIRED' | 'CANCELLED',
  exitPrice?: number,
  pnlPips?: number,
  pnlPercent?: number
): Promise<void> {
  const db = getDb();
  await db
    .update(signals)
    .set({
      status,
      exitPrice,
      pnlPips,
      pnlPercent,
      resolvedAt: new Date(),
    })
    .where(eq(signals.id, signalId));
}

export async function getOpenSignals(): Promise<(Signal & { id: string })[]> {
  const db = getDb();
  const rows = await db.select().from(signals).where(eq(signals.status, 'OPEN'));

  return rows.map((r) => ({
    id: r.id,
    agent_id: r.agentId,
    strategy: r.strategy,
    timestamp: r.timestamp.toISOString(),
    asset: r.asset,
    timeframe: r.timeframe,
    direction: r.direction as 'BUY' | 'SELL',
    entry: r.entry,
    stop_loss: r.stopLoss,
    take_profit_1: r.takeProfit1,
    take_profit_2: r.takeProfit2 ?? undefined,
    risk_reward_ratio: r.riskRewardRatio,
    position_size_pct: r.positionSizePct,
    confidence_pct: r.confidencePct,
    session: r.session,
    rationale: r.rationale,
    invalidation: r.invalidation,
    status: r.status as Signal['status'],
  }));
}

export async function getSignalsByAgent(agentId: string, limit = 100): Promise<Signal[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(signals)
    .where(eq(signals.agentId, agentId))
    .orderBy(desc(signals.timestamp))
    .limit(limit);

  return rows.map(rowToSignal);
}

export async function getDailySignalCount(agentId?: string): Promise<number> {
  const db = getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const query = db
    .select({ count: count() })
    .from(signals)
    .where(gte(signals.timestamp, startOfDay));

  if (agentId) {
    // Would add and(signals.agentId === agentId) with proper drizzle syntax
  }

  const result = await query;
  return result[0]?.count ?? 0;
}

// ── Agent Repository ───────────────────────────────

export async function getAgent(agentId: string) {
  const db = getDb();
  const rows = await db.select().from(agents).where(eq(agents.id, agentId));
  return rows[0] ?? null;
}

export async function getAllAgents() {
  const db = getDb();
  return db.select().from(agents).where(eq(agents.status, 'ACTIVE'));
}

export async function updateAgentStatus(agentId: string, status: string): Promise<void> {
  const db = getDb();
  await db.update(agents).set({ status, updatedAt: new Date() }).where(eq(agents.id, agentId));
}

export async function createAgent(
  id: string,
  strategy: string,
  promptFile: string,
  model: string,
  parentAgentId?: string
): Promise<void> {
  const db = getDb();
  await db.insert(agents).values({
    id,
    strategy,
    promptFile,
    model,
    status: 'ACTIVE',
    version: 1,
    parentAgentId,
  });
}

// ── Weekly Performance Repository ──────────────────

export async function saveWeeklyPerformance(perf: WeeklyPerformance): Promise<void> {
  const db = getDb();
  await db.insert(weeklyPerformance).values({
    id: randomUUID(),
    agentId: perf.agentId,
    weekStart: perf.weekStart,
    weekEnd: perf.weekEnd,
    totalSignals: perf.totalSignals,
    wins: perf.wins,
    losses: perf.losses,
    expired: perf.expired,
    winRate: perf.winRate,
    profitFactor: perf.profitFactor,
    maxDrawdown: perf.maxDrawdown,
    avgRR: perf.avgRR,
    compositeScore: perf.compositeScore,
    status: perf.status,
  });
}

export async function getWeeklyPerformance(weekStart: Date): Promise<WeeklyPerformance[]> {
  const db = getDb();
  // Implementation would use proper drizzle queries
  return [];
}

// ── Elimination Repository ─────────────────────────

export async function saveEliminationRecord(record: EliminationRecord): Promise<void> {
  const db = getDb();
  // Implementation
}

export async function getEliminationHistory(limit = 20): Promise<EliminationRecord[]> {
  const db = getDb();
  // Implementation
  return [];
}

// ── Scan Cycle Repository ──────────────────────────

export async function saveScanCycle(result: ScanCycleResult, durationMs: number): Promise<void> {
  const db = getDb();
  await db.insert(scanCycles).values({
    id: randomUUID(),
    timestamp: result.timestamp,
    asset: result.asset,
    timeframe: result.timeframe,
    agentResponses: JSON.stringify(result.agentResponses),
    approvedSignals: result.approvedSignals,
    suppressedSignals: result.suppressedSignals,
    durationMs,
  });
}

// ── Helper ─────────────────────────────────────────

function rowToSignal(row: typeof signals.$inferSelect): Signal {
  return {
    agent_id: row.agentId,
    strategy: row.strategy,
    timestamp: row.timestamp.toISOString(),
    asset: row.asset,
    timeframe: row.timeframe,
    direction: row.direction as 'BUY' | 'SELL',
    entry: row.entry,
    stop_loss: row.stopLoss,
    take_profit_1: row.takeProfit1,
    take_profit_2: row.takeProfit2 ?? undefined,
    risk_reward_ratio: row.riskRewardRatio,
    position_size_pct: row.positionSizePct,
    confidence_pct: row.confidencePct,
    session: row.session,
    rationale: row.rationale,
    invalidation: row.invalidation,
    status: row.status as Signal['status'],
  };
}
