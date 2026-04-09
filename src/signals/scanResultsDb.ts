import { getDb } from './db.js';
import { agentScanResults } from './schema.js';
import { eq, desc, and, count as sqlCount, avg as sqlAvg, max as sqlMax } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface AgentScanResult {
  id: string;
  scanCycleId: string;
  agentId: string;
  agentName: string;
  asset: string;
  response: string;
  isSignal: boolean;
  direction: string | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  riskRewardRatio: number | null;
  confidence: number | null;
  rationale: string | null;
  responseTimeMs: number;
  riskApproved: boolean;
  timestamp: Date;
}

export interface AgentPerformanceStats {
  totalScans: number;
  totalSignals: number;
  approvedSignals: number;
  suppressedSignals: number;
  avgResponseTime: number;
  lastScanAt: string | null;
  lastSignalAt: string | null;
}

/**
 * Save an agent's scan result
 */
export async function saveScanResult(data: {
  scanCycleId: string;
  agentId: string;
  agentName: string;
  asset: string;
  response: string;
  isSignal: boolean;
  direction?: string;
  entry?: number;
  stopLoss?: number;
  takeProfit1?: number;
  riskRewardRatio?: number;
  confidence?: number;
  rationale?: string;
  responseTimeMs: number;
  riskApproved: boolean;
}): Promise<string> {
  const db = getDb();
  const id = randomUUID();

  await db.insert(agentScanResults).values({
    id,
    scanCycleId: data.scanCycleId,
    agentId: data.agentId,
    agentName: data.agentName,
    asset: data.asset,
    response: data.response,
    isSignal: data.isSignal ? 1 : 0,
    direction: data.direction || null,
    entry: data.entry || null,
    stopLoss: data.stopLoss || null,
    takeProfit1: data.takeProfit1 || null,
    riskRewardRatio: data.riskRewardRatio || null,
    confidence: data.confidence || null,
    rationale: data.rationale || null,
    responseTimeMs: data.responseTimeMs,
    riskApproved: data.riskApproved ? 1 : 0,
  });

  return id;
}

/**
 * Get scan results for a specific agent
 */
export async function getAgentResults(agentId: string, limit = 20): Promise<AgentScanResult[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(agentScanResults)
    .where(eq(agentScanResults.agentId, agentId))
    .orderBy(desc(agentScanResults.timestamp))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    scanCycleId: r.scanCycleId,
    agentId: r.agentId,
    agentName: r.agentName,
    asset: r.asset,
    response: r.response,
    isSignal: r.isSignal === 1,
    direction: r.direction,
    entry: r.entry,
    stopLoss: r.stopLoss,
    takeProfit1: r.takeProfit1,
    riskRewardRatio: r.riskRewardRatio,
    confidence: r.confidence,
    rationale: r.rationale,
    responseTimeMs: r.responseTimeMs,
    riskApproved: r.riskApproved === 1,
    timestamp: r.timestamp,
  }));
}

/**
 * Get latest result for an agent on a specific asset
 */
export async function getLatestResult(agentId: string, asset: string): Promise<AgentScanResult | null> {
  const db = getDb();

  const rows = await db
    .select()
    .from(agentScanResults)
    .where(and(eq(agentScanResults.agentId, agentId), eq(agentScanResults.asset, asset)))
    .orderBy(desc(agentScanResults.timestamp))
    .limit(1);

  if (rows.length === 0) return null;

  const r = rows[0];
  return {
    id: r.id,
    scanCycleId: r.scanCycleId,
    agentId: r.agentId,
    agentName: r.agentName,
    asset: r.asset,
    response: r.response,
    isSignal: r.isSignal === 1,
    direction: r.direction,
    entry: r.entry,
    stopLoss: r.stopLoss,
    takeProfit1: r.takeProfit1,
    riskRewardRatio: r.riskRewardRatio,
    confidence: r.confidence,
    rationale: r.rationale,
    responseTimeMs: r.responseTimeMs,
    riskApproved: r.riskApproved === 1,
    timestamp: r.timestamp,
  };
}

/**
 * Get performance stats for an agent
 */
export async function getAgentStats(agentId: string): Promise<AgentPerformanceStats> {
  const db = getDb();

  const rows = await db
    .select()
    .from(agentScanResults)
    .where(eq(agentScanResults.agentId, agentId))
    .orderBy(desc(agentScanResults.timestamp));

  const totalScans = rows.length;
  const totalSignals = rows.filter((r) => r.isSignal).length;
  const approvedSignals = rows.filter((r) => r.riskApproved).length;
  const suppressedSignals = totalSignals - approvedSignals;
  const avgResponseTime = totalScans > 0
    ? Math.round(rows.reduce((sum, r) => sum + r.responseTimeMs, 0) / totalScans)
    : 0;
  const lastScanAt = rows.length > 0 ? rows[0].timestamp.toISOString() : null;
  const signalRows = rows.filter((r) => r.isSignal);
  const lastSignalAt = signalRows.length > 0 ? signalRows[0].timestamp.toISOString() : null;

  return {
    totalScans,
    totalSignals,
    approvedSignals,
    suppressedSignals,
    avgResponseTime,
    lastScanAt,
    lastSignalAt,
  };
}
