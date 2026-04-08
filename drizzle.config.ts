import { defineConfig } from 'drizzle-kit';
import { loadConfig, getRootDir } from './src/shared/config.js';
import { join } from 'path';

const config = loadConfig();
const rootDir = getRootDir();

export default defineConfig({
  schema: './src/signals/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: join(rootDir, config.database.path),
  },
  out: './drizzle',
  verbose: true,
  strict: true,
});
