#!/usr/bin/env tsx
/**
 * Seed Script — Populates the database with initial 10 agents
 */

import { runMigrations, getDb } from '../signals/db.js';
import { agents } from '../signals/schema.js';
import { loadConfig } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';

const INITIAL_AGENTS = [
  { id: 'AGENT-01', strategy: 'ICT Concepts', promptFile: 'ict_concepts.json' },
  { id: 'AGENT-02', strategy: 'Smart Money Concepts', promptFile: 'smc.json' },
  { id: 'AGENT-03', strategy: 'Support & Resistance', promptFile: 'support_resistance.json' },
  { id: 'AGENT-04', strategy: 'RSI + Price Action', promptFile: 'rsi_price_action.json' },
  { id: 'AGENT-05', strategy: 'MACD Momentum', promptFile: 'macd_momentum.json' },
  { id: 'AGENT-06', strategy: 'Trend Following', promptFile: 'trend_following.json' },
  { id: 'AGENT-07', strategy: 'Breakout Hunter', promptFile: 'breakout_hunter.json' },
  { id: 'AGENT-08', strategy: 'Mean Reversion', promptFile: 'mean_reversion.json' },
  { id: 'AGENT-09', strategy: 'Volatility Squeeze', promptFile: 'volatility_squeeze.json' },
  { id: 'AGENT-10', strategy: 'Multi-Confluence', promptFile: 'multi_confluence.json' },
];

async function seed() {
  const logger = getLogger();
  const config = loadConfig();

  console.log('🌱 Seeding database...');

  // Step 1: Run migrations
  console.log('📦 Running migrations...');
  await runMigrations();
  console.log('✅ Migrations complete');

  // Step 2: Get database connection
  const db = getDb();

  // Step 3: Check if agents already exist
  const existing = await db.select().from(agents);
  if (existing.length > 0) {
    console.log(`⚠️  Database already has ${existing.length} agents — skipping seed`);
    return;
  }

  // Step 4: Insert initial agents
  console.log(`🤖 Inserting ${INITIAL_AGENTS.length} agents...`);

  await db.insert(agents).values(
    INITIAL_AGENTS.map((agent) => ({
      ...agent,
      model: process.env.AI_CLI_MODEL || 'qwen-vl-plus',
      status: 'ACTIVE' as const,
      version: 1,
    }))
  );

  console.log('✅ All agents seeded successfully');

  // Step 5: Verify
  const allAgents = await db.select().from(agents);
  console.log(`\n📊 Seeded agents (${allAgents.length} total):`);
  allAgents.forEach((a) => {
    console.log(`  ${a.id} — ${a.strategy} (${a.promptFile}) [v${a.version}, ${a.status}]`);
  });

  console.log('\n🎉 Seed complete');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
