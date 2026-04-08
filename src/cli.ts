#!/usr/bin/env node
/**
 * The Arena — CLI Entry Point
 */

import { Command } from 'commander';
import { loadConfig } from './shared/config.js';
import { getLogger } from './shared/logger.js';

const program = new Command();

program
  .name('arena')
  .description('The Arena — AI Multi-Agent Trading Signal System')
  .version('0.1.0');

program
  .command('start')
  .description('Start the Arena orchestrator (NY session mode)')
  .option('--dry-run', 'Run without sending signals or Telegram alerts')
  .option('--agents <count>', 'Number of agents to run (default: 10)', '10')
  .action(async (opts) => {
    const config = loadConfig();
    const logger = getLogger();

    logger.info({
      msg: '🏛️ The Arena starting',
      version: config.version,
      agents: opts.agents,
      sessionWindow: `${config.session.start} - ${config.session.end} ${config.session.timezone}`,
      scanInterval: `${config.scan.intervalMinutes} minutes`,
      assets: config.scan.assets,
      dryRun: opts.dryRun || false,
    });

    const { startOrchestrator } = await import('./orchestrator/orchestrator.js');
    await startOrchestrator({
      dryRun: opts.dryRun || false,
      maxAgents: parseInt(opts.agents, 10),
    });
  });

program
  .command('session:status')
  .description('Check if NY session is currently active')
  .action(async () => {
    const { checkSessionActive } = await import('./orchestrator/sessionManager.js');
    const status = checkSessionActive();
    console.log(
      status.isActive
        ? `🟢 NY Session ACTIVE — ${status.startTime?.toLocaleTimeString()} to ${status.endTime?.toLocaleTimeString()}`
        : `🌙 NY Session INACTIVE — Next open: status.nextOpen?.toLocaleTimeString() ?? 'N/A'`
    );
  });

program
  .command('dashboard')
  .description('Start the web dashboard')
  .action(async () => {
    const config = loadConfig();
    const logger = getLogger();
    logger.info(`📊 Starting dashboard on port ${config.dashboard.port}...`);
    console.log(`Dashboard: http://localhost:${config.dashboard.port}`);
  });

program
  .command('config:show')
  .description('Show current configuration')
  .action(() => {
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
