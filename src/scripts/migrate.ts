#!/usr/bin/env tsx
/**
 * Database migration runner
 */

import { runMigrations } from '../signals/db.js';

async function main() {
  console.log('🔄 Running database migrations...');
  await runMigrations();
  console.log('✅ Migrations complete');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
