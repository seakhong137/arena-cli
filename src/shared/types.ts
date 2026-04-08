import { z } from 'zod';

// ── Signal Schema ──────────────────────────────────

export const SignalSchema = z.object({
  agent_id: z.string(),
  strategy: z.string(),
  timestamp: z.string(),
  asset: z.string(),
  timeframe: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  entry: z.number().positive(),
  stop_loss: z.number().positive(),
  take_profit_1: z.number().positive(),
  take_profit_2: z.number().positive().optional(),
  risk_reward_ratio: z.number().positive(),
  position_size_pct: z.number().positive().default(1.0),
  confidence_pct: z.number().int().min(0).max(100),
  session: z.string(),
  rationale: z.string(),
  invalidation: z.string(),
  status: z.enum(['OPEN', 'TP_HIT', 'SL_HIT', 'EXPIRED', 'CANCELLED']).default('OPEN'),
});

export type Signal = z.infer<typeof SignalSchema>;

// ── Agent Status ──────────────────────────────────

export type AgentStatus = 'ACTIVE' | 'PAUSED' | 'ELIMINATED' | 'MUTATED';

// ── Agent Definition ──────────────────────────────

export interface Agent {
  id: string;
  strategy: string;
  promptFile: string;
  model: string;
  status: AgentStatus;
  version: number; // v1, v2, etc. after mutations
  createdAt: Date;
  eliminatedAt?: Date;
  parentAgentId?: string; // For mutated agents
}

// ── Signal Outcome ────────────────────────────────

export interface SignalOutcome {
  id: string;
  signalId: string;
  agentId: string;
  outcomeType: 'TP_HIT' | 'SL_HIT' | 'EXPIRED' | 'CANCELLED';
  exitPrice: number;
  pnlPips: number;
  pnlPercent: number;
  hitAt: Date;
  durationMinutes: number;
}

// ── Weekly Performance ────────────────────────────

export interface WeeklyPerformance {
  agentId: string;
  weekStart: Date;
  weekEnd: Date;
  totalSignals: number;
  wins: number;
  losses: number;
  expired: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  avgRR: number;
  compositeScore: number;
  status: 'HEALTHY' | 'WARNING' | 'AT_RISK' | 'ELIMINATED';
}

// ── Elimination Record ────────────────────────────

export interface EliminationRecord {
  id: string;
  agentId: string;
  strategy: string;
  weekStart: Date;
  weekEnd: Date;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  reason: string;
  mutatedAgentId?: string;
  mutationPrompt?: string;
  eliminatedAt: Date;
}

// ── Risk Manager Result ───────────────────────────

export interface RiskManagerResult {
  approved: boolean;
  filtersApplied: string[];
  filtersTriggered: string[];
  approvedAt?: string;
  rejectionReason?: string;
}

// ── Agent Response ────────────────────────────────

export type AgentResponse = Signal | 'NO_SIGNAL';

// ── Scan Cycle Result ─────────────────────────────

export interface ScanCycleResult {
  timestamp: Date;
  asset: string;
  timeframe: string;
  agentResponses: Array<{
    agentId: string;
    response: AgentResponse;
    responseTimeMs: number;
    error?: string;
  }>;
  approvedSignals: number;
  suppressedSignals: number;
}

// ── Session Status ────────────────────────────────

export interface SessionStatus {
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
  totalSignals: number;
  totalApproved: number;
  totalSuppressed: number;
  lastScanAt?: Date;
}
