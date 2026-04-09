import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ── Agents Table ──────────────────────────────────

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  strategy: text('strategy').notNull(),
  promptFile: text('prompt_file').notNull(),
  model: text('model').notNull().default('qwen-vl-plus'),
  status: text('status').notNull().default('ACTIVE'),
  version: integer('version').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  eliminatedAt: integer('eliminated_at', { mode: 'timestamp_ms' }),
  parentAgentId: text('parent_agent_id').references((): any => agents.id),
});

// ── Signals Table ──────────────────────────────────

export const signals = sqliteTable('signals', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  strategy: text('strategy').notNull(),
  asset: text('asset').notNull(),
  timeframe: text('timeframe').notNull(),
  direction: text('direction').notNull(),
  entry: real('entry').notNull(),
  stopLoss: real('stop_loss').notNull(),
  takeProfit1: real('take_profit_1').notNull(),
  takeProfit2: real('take_profit_2'),
  riskRewardRatio: real('risk_reward_ratio').notNull(),
  positionSizePct: real('position_size_pct').notNull().default(1.0),
  confidencePct: integer('confidence_pct').notNull(),
  session: text('session').notNull(),
  rationale: text('rationale').notNull(),
  invalidation: text('invalidation').notNull(),
  status: text('status').notNull().default('OPEN'),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
  exitPrice: real('exit_price'),
  pnlPips: real('pnl_pips'),
  pnlPercent: real('pnl_percent'),
});

// ── Signal Outcomes Table ──────────────────────────

export const signalOutcomes = sqliteTable('signal_outcomes', {
  id: text('id').primaryKey(),
  signalId: text('signal_id').notNull().references(() => signals.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  outcomeType: text('outcome_type').notNull(),
  exitPrice: real('exit_price').notNull(),
  pnlPips: real('pnl_pips').notNull(),
  pnlPercent: real('pnl_percent').notNull(),
  hitAt: integer('hit_at', { mode: 'timestamp_ms' }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
});

// ── Weekly Performance Table ───────────────────────

export const weeklyPerformance = sqliteTable('weekly_performance', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  weekStart: integer('week_start', { mode: 'timestamp_ms' }).notNull(),
  weekEnd: integer('week_end', { mode: 'timestamp_ms' }).notNull(),
  totalSignals: integer('total_signals').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  expired: integer('expired').notNull().default(0),
  winRate: real('win_rate').notNull().default(0),
  profitFactor: real('profit_factor').notNull().default(0),
  maxDrawdown: real('max_drawdown').notNull().default(0),
  avgRR: real('avg_rr').notNull().default(0),
  compositeScore: real('composite_score').notNull().default(0),
  status: text('status').notNull().default('HEALTHY'),
});

// ── Elimination Records Table ──────────────────────

export const eliminationRecords = sqliteTable('elimination_records', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  strategy: text('strategy').notNull(),
  weekStart: integer('week_start', { mode: 'timestamp_ms' }).notNull(),
  weekEnd: integer('week_end', { mode: 'timestamp_ms' }).notNull(),
  winRate: real('win_rate').notNull(),
  profitFactor: real('profit_factor').notNull(),
  maxDrawdown: real('max_drawdown').notNull(),
  reason: text('reason').notNull(),
  mutatedAgentId: text('mutated_agent_id'),
  mutationPrompt: text('mutation_prompt'),
  eliminatedAt: integer('eliminated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ── Scan Cycles Table (audit log) ──────────────────

export const scanCycles = sqliteTable('scan_cycles', {
  id: text('id').primaryKey(),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  asset: text('asset').notNull(),
  timeframe: text('timeframe').notNull(),
  agentResponses: text('agent_responses', { mode: 'json' }).notNull(),
  approvedSignals: integer('approved_signals').notNull().default(0),
  suppressedSignals: integer('suppressed_signals').notNull().default(0),
  durationMs: integer('duration_ms').notNull(),
});

// ── System Events Table (audit log) ────────────────

export const systemEvents = sqliteTable('system_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ── Chat Messages Table (agent chat room) ──────────

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  agentId: text('agent_id'), // null for system messages
  agentName: text('agent_name'), // display name
  type: text('type').notNull(), // 'analysis', 'debate', 'critique', 'elimination', 'system', 'farewell'
  content: text('content').notNull(),
  targetAgentId: text('target_agent_id'), // for elimination or critique targeting
  targetAsset: text('target_asset'), // what asset they're discussing
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  scanCycleId: text('scan_cycle_id'), // which scan cycle this belongs to
});

// ── Agent Scan Results Table ───────────────────────

export const agentScanResults = sqliteTable('agent_scan_results', {
  id: text('id').primaryKey(),
  scanCycleId: text('scan_cycle_id').notNull(),
  agentId: text('agent_id').notNull(),
  agentName: text('agent_name').notNull(),
  asset: text('asset').notNull(),
  response: text('response').notNull(), // 'NO_SIGNAL' or JSON string
  isSignal: integer('is_signal').notNull().default(0), // 0 or 1
  direction: text('direction'), // BUY, SELL, or null
  entry: real('entry'),
  stopLoss: real('stop_loss'),
  takeProfit1: real('take_profit_1'),
  riskRewardRatio: real('risk_reward_ratio'),
  confidence: integer('confidence'),
  rationale: text('rationale'), // Agent's analysis narrative
  responseTimeMs: integer('response_time_ms').notNull(),
  riskApproved: integer('risk_approved').notNull().default(0), // 0 or 1
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});
