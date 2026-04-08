import pino from 'pino';
import { join } from 'path';
import { getRootDir, loadConfig } from './config.js';
import { existsSync, mkdirSync } from 'fs';

let logger: pino.Logger;

export function getLogger(): pino.Logger {
  if (logger) return logger;

  const config = loadConfig();
  const rootDir = getRootDir();
  const logFile = join(rootDir, config.logging.file);

  // Ensure data directory exists
  const logDir = join(rootDir, 'data');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  logger = pino({
    level: config.logging.level,
    transport: {
      target: 'pino/file',
      options: {
        destination: logFile,
        mkdir: true,
      },
    },
  });

  return logger;
}
