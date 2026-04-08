import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { loadConfig, getRootDir } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle>;

export function getDb() {
  if (db) return db;

  const config = loadConfig();
  const rootDir = getRootDir();
  const logger = getLogger();

  const dbPath = join(rootDir, config.database.path);

  // Ensure data directory exists
  const dbDir = join(rootDir, 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  logger.info({ msg: 'Connecting to SQLite', path: dbPath });

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema });

  logger.info('✅ SQLite connected');

  return db;
}

/**
 * Run database migrations (create tables if they don't exist)
 */
export async function runMigrations(): Promise<void> {
  const logger = getLogger();
  const sqlite = new Database(getDbPath());

  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');

  // Create tables manually for simplicity
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      strategy TEXT NOT NULL,
      prompt_file TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'qwen-vl-plus',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      eliminated_at INTEGER,
      parent_agent_id TEXT REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      strategy TEXT NOT NULL,
      asset TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      direction TEXT NOT NULL,
      entry REAL NOT NULL,
      stop_loss REAL NOT NULL,
      take_profit_1 REAL NOT NULL,
      take_profit_2 REAL,
      risk_reward_ratio REAL NOT NULL,
      position_size_pct REAL NOT NULL DEFAULT 1.0,
      confidence_pct INTEGER NOT NULL,
      session TEXT NOT NULL,
      rationale TEXT NOT NULL,
      invalidation TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      timestamp INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      resolved_at INTEGER,
      exit_price REAL,
      pnl_pips REAL,
      pnl_percent REAL
    );

    CREATE TABLE IF NOT EXISTS signal_outcomes (
      id TEXT PRIMARY KEY,
      signal_id TEXT NOT NULL REFERENCES signals(id),
      agent_id TEXT NOT NULL REFERENCES agents(id),
      outcome_type TEXT NOT NULL,
      exit_price REAL NOT NULL,
      pnl_pips REAL NOT NULL,
      pnl_percent REAL NOT NULL,
      hit_at INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_performance (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      week_start INTEGER NOT NULL,
      week_end INTEGER NOT NULL,
      total_signals INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      expired INTEGER NOT NULL DEFAULT 0,
      win_rate REAL NOT NULL DEFAULT 0,
      profit_factor REAL NOT NULL DEFAULT 0,
      max_drawdown REAL NOT NULL DEFAULT 0,
      avg_rr REAL NOT NULL DEFAULT 0,
      composite_score REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'HEALTHY'
    );

    CREATE TABLE IF NOT EXISTS elimination_records (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      strategy TEXT NOT NULL,
      week_start INTEGER NOT NULL,
      week_end INTEGER NOT NULL,
      win_rate REAL NOT NULL,
      profit_factor REAL NOT NULL,
      max_drawdown REAL NOT NULL,
      reason TEXT NOT NULL,
      mutated_agent_id TEXT,
      mutation_prompt TEXT,
      eliminated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS scan_cycles (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      asset TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      agent_responses TEXT NOT NULL,
      approved_signals INTEGER NOT NULL DEFAULT 0,
      suppressed_signals INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      agent_name TEXT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      target_agent_id TEXT,
      target_asset TEXT,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      scan_cycle_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_chat_agent ON chat_messages(agent_id);
    CREATE INDEX IF NOT EXISTS idx_chat_cycle ON chat_messages(scan_cycle_id);

    CREATE INDEX IF NOT EXISTS idx_signals_agent_id ON signals(agent_id);
    CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
    CREATE INDEX IF NOT EXISTS idx_signals_asset ON signals(asset);
    CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp);
    CREATE INDEX IF NOT EXISTS idx_weekly_performance_agent_week ON weekly_performance(agent_id, week_start);
    CREATE INDEX IF NOT EXISTS idx_scan_cycles_timestamp ON scan_cycles(timestamp);
  `);

  sqlite.close();
  logger.info('✅ Database migrations complete');
}

function getDbPath(): string {
  const config = loadConfig();
  const rootDir = getRootDir();
  return join(rootDir, config.database.path);
}
