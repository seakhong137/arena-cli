import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env file
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname = .../arena-cli/src/shared
// rootDir should be .../arena-cli
const rootDir = join(__dirname, '..', '..');

export interface ArenaConfig {
  version: string;
  session: SessionConfig;
  scan: ScanConfig;
  agents: AgentConfig;
  riskManager: RiskManagerConfig;
  confluenceThreshold: number;
  elimination: EliminationConfig;
  telegram: TelegramConfig;
  database: DatabaseConfig;
  dashboard: DashboardConfig;
  logging: LoggingConfig;
}

export interface SessionConfig {
  start: string;
  end: string;
  warmupMinutes: number;
  timezone: string;
}

export interface ScanConfig {
  intervalMinutes: number;
  assets: string[];
  primaryTimeframe: string;
  contextTimeframes: string[];
  ohlcvCount: number;
  agentTimeoutSeconds: number;
}

export interface AgentConfig {
  initial: AgentDefinition[];
}

export interface AgentDefinition {
  id: string;
  strategy: string;
  promptFile: string;
  model: string;
}

export interface RiskManagerConfig {
  maxDailySignalsGlobal: number;
  maxDailySignalsPerAgent: number;
  minRiskRewardRatio: number;
  minConfidencePct: number;
  volatilityAtrMultiplier: number;
  maxCorrelatedUsdSignals: number;
  duplicateGuardMinutes: number;
}

export interface EliminationConfig {
  schedule: string;
  minWeeklySignals: number;
  winRateThreshold: number;
  profitFactorThreshold: number;
  maxDrawdownThreshold: number;
  mutationModel: string;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface DatabaseConfig {
  path: string;
}

export interface DashboardConfig {
  port: number;
  enabled: boolean;
}

export interface LoggingConfig {
  level: string;
  file: string;
}

/**
 * Load settings from config/settings.json and override with environment variables
 */
export function loadConfig(): ArenaConfig {
  const settingsPath = join(rootDir, 'config', 'settings.json');
  const raw = readFileSync(settingsPath, 'utf-8');
  const config: ArenaConfig = JSON.parse(raw);

  // Override with environment variables where set
  if (process.env.GEMINI_MODEL) {
    config.agents.initial.forEach(a => (a.model = process.env.GEMINI_MODEL!));
  }
  if (process.env.NY_SESSION_START) {
    config.session.start = process.env.NY_SESSION_START;
  }
  if (process.env.NY_SESSION_END) {
    config.session.end = process.env.NY_SESSION_END;
  }
  if (process.env.SCAN_INTERVAL_MINUTES) {
    config.scan.intervalMinutes = parseInt(process.env.SCAN_INTERVAL_MINUTES, 10);
  }
  if (process.env.ASSETS) {
    config.scan.assets = process.env.ASSETS.split(',');
  }
  if (process.env.TELEGRAM_BOT_TOKEN) {
    config.telegram.botToken = process.env.TELEGRAM_BOT_TOKEN;
    config.telegram.enabled = true;
  }
  if (process.env.TELEGRAM_CHAT_ID) {
    config.telegram.chatId = process.env.TELEGRAM_CHAT_ID;
  }
  if (process.env.DATABASE_PATH) {
    config.database.path = process.env.DATABASE_PATH;
  }
  if (process.env.DASHBOARD_PORT) {
    config.dashboard.port = parseInt(process.env.DASHBOARD_PORT, 10);
  }
  if (process.env.LOG_LEVEL) {
    config.logging.level = process.env.LOG_LEVEL;
  }
  if (process.env.GEMINI_TIMEOUT) {
    config.scan.agentTimeoutSeconds = parseInt(process.env.GEMINI_TIMEOUT, 10);
  }
  if (process.env.CONFLUENCE_THRESHOLD) {
    config.confluenceThreshold = parseInt(process.env.CONFLUENCE_THRESHOLD, 10);
  }

  return config;
}

/**
 * Get root directory path
 */
export function getRootDir(): string {
  return rootDir;
}
