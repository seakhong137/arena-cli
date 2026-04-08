/**
 * The Arena — Orchestrator
 * Main scan cycle logic: assets → MCP → agents → risk → save → Telegram
 */

import { loadConfig, getRootDir } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import { checkSessionActive } from './sessionManager.js';
import { fetchAssetData, disconnectMcp } from '../mcp/client.js';
import { runAllAgents } from '../agents/agentPool.js';
import { applyRiskFilters } from '../risk/riskManager.js';
import { saveSignal, saveScanCycle } from '../signals/signalDb.js';
import { sendSignalAlert, sendSessionStart, sendSessionEnd } from '../telegram/bot.js';
import { startPriceMonitor, stopPriceMonitor } from '../signals/priceMonitor.js';
import { runEliminationCycle } from '../elimination/weeklyEngine.js';
import { mutateAgent } from '../elimination/mutationEngine.js';
import { initTelegram } from '../telegram/bot.js';
import { runPreSignalDebate, runEliminationCeremony, postSessionStart, postSessionEnd } from '../signals/chatEngine.js';
import { randomUUID } from 'crypto';
import cron from 'node-cron';
import type { Signal, AgentResponse, ScanCycleResult } from '../shared/types.js';

export interface OrchestratorOptions {
  dryRun: boolean;
  maxAgents: number;
}

let isRunning = false;
let sessionActive = false;
let dailyStats = { totalSignals: 0, approvedSignals: 0, suppressedSignals: 0 };

/**
 * Start the main orchestrator loop
 */
export async function startOrchestrator(opts: OrchestratorOptions): Promise<void> {
  const config = loadConfig();
  const logger = getLogger();

  if (isRunning) {
    logger.warn('Orchestrator already running');
    return;
  }

  isRunning = true;
  logger.info('🔄 Orchestrator initialized');

  // Initialize Telegram
  initTelegram();

  // Start price monitor (runs continuously)
  startPriceMonitor(1); // Check every 1 minute

  // Set up scan cycle cron job (every N minutes)
  const cronExpression = `*/${config.scan.intervalMinutes} * * * *`;
  logger.info(`📅 Scan cycle scheduled: ${cronExpression} (during NY session)`);

  const scanJob = cron.schedule(cronExpression, async () => {
    const sessionCheck = checkSessionActive();

    if (!sessionCheck.isActive) {
      if (sessionActive) {
        // Session just ended
        logger.info('🌙 NY session ended');
        await sendSessionEnd(dailyStats);
        sessionActive = false;
        dailyStats = { totalSignals: 0, approvedSignals: 0, suppressedSignals: 0 };
      }
      logger.debug('NY session not active — skipping scan cycle');
      return;
    }

    if (!sessionActive) {
      // Session just started
      logger.info('🔔 NY session started — agents active');
      await sendSessionStart();
      await postSessionStart();
      sessionActive = true;
    }

    logger.info('🔍 Starting scan cycle...');
    await runScanCycle(opts);
  });

  // Set up weekly elimination cron (Sunday 23:59 EST)
  const eliminationJob = cron.schedule('59 23 * * 0', async () => {
    logger.info('⚔️ Weekly elimination cycle starting...');
    const result = await runEliminationCycle();

    if (result.eliminatedAgent) {
      // Get surviving agents
      const allAgents = require('../agents/agentPool.js').getActiveAgents();
      const survivingAgents = allAgents.filter((a: any) => a.id !== result.eliminatedAgent);

      // Run elimination ceremony
      await runEliminationCeremony(
        { id: result.eliminatedAgent, strategy: 'Unknown' },
        survivingAgents
      );

      // Trigger mutation
      const mutationResult = await mutateAgent(
        result.eliminatedAgent,
        'Unknown',
        '',
        { winRate: 0, profitFactor: 0, maxDrawdown: 0, lossPatterns: 'N/A' }
      );

      logger.info({
        msg: 'Mutation complete',
        eliminated: result.eliminatedAgent,
        newAgent: mutationResult.newAgentId,
      });
    }
  });

  // Start the jobs
  scanJob.start();
  eliminationJob.start();

  logger.info('🏛️ The Arena is live — waiting for NY session...');

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('👋 Shutting down...');
    scanJob.stop();
    eliminationJob.stop();
    stopPriceMonitor();
    disconnectMcp();
    isRunning = false;
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('👋 Shutting down...');
    scanJob.stop();
    eliminationJob.stop();
    stopPriceMonitor();
    disconnectMcp();
    isRunning = false;
    process.exit(0);
  });
}

/**
 * Run a single scan cycle (all assets → MCP → agents → filter → save)
 */
async function runScanCycle(opts: OrchestratorOptions): Promise<void> {
  const config = loadConfig();
  const logger = getLogger();
  const cycleStart = Date.now();

  for (const asset of config.scan.assets) {
    try {
      // Step 1: Fetch asset data from MCP
      const assetData = await fetchAssetData(
        asset,
        config.scan.primaryTimeframe,
        config.scan.contextTimeframes,
        config.scan.ohlcvCount
      );

      // Step 1.5: Pre-signal debate
      const scanCycleId = randomUUID();
      const agents = require('../agents/agentPool.js').getActiveAgents();
      const chartContext = `${asset} at ${assetData.quote?.last || 'N/A'} | OHLCV: ${assetData.ohlcv.length} candles | Indicators: ${Object.keys(assetData.indicators).length} loaded`;

      await runPreSignalDebate(agents, asset, chartContext, scanCycleId);

      // Step 2: Build payload input
      const payloadInput = {
        asset,
        currentTime: new Date().toISOString(),
        session: 'New York',
        screenshot: assetData.screenshot,
        ohlcv: assetData.ohlcv,
        indicators: assetData.indicators,
        quote: assetData.quote,
      };

      // Step 3: Run all agents
      const agentResults = await runAllAgents(payloadInput);

      // Step 4: Process each agent's response
      let approvedCount = 0;
      let suppressedCount = 0;

      for (const result of agentResults) {
        if (result.response === 'NO_SIGNAL' || typeof result.response === 'string') {
          suppressedCount++;
          continue;
        }

        const signal = result.response as Signal;

        // Step 5: Apply risk filters
        const riskResult = await applyRiskFilters(signal);

        if (riskResult.approved) {
          // Step 6: Save to DB
          if (!opts.dryRun) {
            await saveSignal(signal);
            approvedCount++;
            dailyStats.approvedSignals++;

            // Step 7: Send Telegram alert
            await sendSignalAlert(signal);

            logger.info({
              msg: '✅ Signal approved and sent',
              agentId: signal.agent_id,
              asset: signal.asset,
              direction: signal.direction,
            });
          } else {
            logger.info({ msg: '[DRY RUN] Signal would be approved', signal });
          }
        } else {
          suppressedCount++;
          dailyStats.suppressedSignals++;

          logger.info({
            msg: '🚫 Signal suppressed',
            agentId: signal.agent_id,
            reason: riskResult.rejectionReason,
          });
        }

        dailyStats.totalSignals++;
      }

      // Step 8: Log scan cycle
      const cycleResult: ScanCycleResult = {
        timestamp: new Date(),
        asset,
        timeframe: config.scan.primaryTimeframe,
        agentResponses: agentResults.map((r) => ({
          agentId: r.agentId,
          response: r.response,
          responseTimeMs: r.responseTimeMs,
          error: r.error,
        })),
        approvedSignals: approvedCount,
        suppressedSignals: suppressedCount,
      };

      if (!opts.dryRun) {
        await saveScanCycle(cycleResult, Date.now() - cycleStart);
      }

      logger.info({
        msg: `Scan complete for ${asset}`,
        approved: approvedCount,
        suppressed: suppressedCount,
        durationMs: Date.now() - cycleStart,
      });
    } catch (error: any) {
      logger.error({ msg: `Scan cycle failed for ${asset}`, error: error.message });
    }
  }

  logger.info({
    msg: '📊 Full scan cycle complete',
    durationMs: Date.now() - cycleStart,
    assetsScanned: config.scan.assets.length,
    dryRun: opts.dryRun,
  });
}
