/**
 * Dashboard REST API Server
 * Serves data to the Next.js frontend
 */

import express from 'express';
import cors from 'cors';
import { getAllAgents, getOpenSignals } from '../signals/signalDb.js';
import { getChatMessages, saveChatMessage } from '../signals/chatDb.js';
import { getLogger } from '../shared/logger.js';
import { fetchAssetData } from '../mcp/client.js';
import { runAllAgents } from '../agents/agentPool.js';
import { applyRiskFilters } from '../risk/riskManager.js';
import { saveSignal, saveScanCycle } from '../signals/signalDb.js';
import { runPreSignalDebate } from '../signals/chatEngine.js';
import { randomUUID } from 'crypto';

export async function startDashboard(port: number): Promise<void> {
  const logger = getLogger();
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/agents', async (_req, res) => {
    try {
      const agents = await getAllAgents();
      res.json({ agents });
    } catch (error: any) {
      logger.error({ msg: 'Failed to fetch agents', error: error.message });
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  });

  app.get('/api/signals', async (_req, res) => {
    try {
      const signals = await getOpenSignals();
      res.json({ signals });
    } catch (error: any) {
      logger.error({ msg: 'Failed to fetch signals', error: error.message });
      res.status(500).json({ error: 'Failed to fetch signals' });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Chat endpoints
  app.get('/api/chat', async (_req, res) => {
    try {
      const limit = parseInt((_req.query.limit as string) || '100', 10);
      const messages = await getChatMessages(limit);
      res.json({ messages });
    } catch (error: any) {
      logger.error({ msg: 'Failed to fetch chat messages', error: error.message });
      res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { agentId, agentName, type, content, targetAgentId, targetAsset } = req.body;
      const id = await saveChatMessage({
        agentId,
        agentName,
        type,
        content,
        targetAgentId,
        targetAsset,
        scanCycleId: null,
      });
      res.json({ id });
    } catch (error: any) {
      logger.error({ msg: 'Failed to save chat message', error: error.message });
      res.status(500).json({ error: 'Failed to save chat message' });
    }
  });

  // Manual scan cycle trigger
  app.post('/api/trigger-scan', async (req, res) => {
    try {
      const { asset, dryRun } = req.body || {};
      const config = require('../shared/config.js').loadConfig();
      const assetsToScan = asset ? [asset] : config.scan.assets;
      const scanResults: Array<{ asset: string; approved: number; suppressed: number; signals: any[] }> = [];

      logger.info({ msg: '🔔 Manual scan cycle triggered', assets: assetsToScan, dryRun: dryRun || false });

      // Post to chat
      await saveChatMessage({
        agentId: null,
        agentName: 'System',
        type: 'system',
        content: `🔔 Manual scan cycle triggered by user. Scanning: ${assetsToScan.join(', ')}`,
        targetAgentId: null,
        targetAsset: null,
        scanCycleId: null,
      });

      for (const scanAsset of assetsToScan) {
        const cycleStart = Date.now();

        // Fetch asset data
        const assetData = await fetchAssetData(
          scanAsset,
          config.scan.primaryTimeframe,
          config.scan.contextTimeframes,
          config.scan.ohlcvCount
        );

        // Pre-signal debate
        const scanCycleId = randomUUID();
        const agents = require('../agents/agentPool.js').getActiveAgents();
        const chartContext = `${scanAsset} at ${assetData.quote?.last || 'N/A'} | OHLCV: ${assetData.ohlcv.length} candles`;

        await runPreSignalDebate(agents, scanAsset, chartContext, scanCycleId);

        // Build payload
        const payloadInput = {
          asset: scanAsset,
          currentTime: new Date().toISOString(),
          session: 'New York',
          screenshot: assetData.screenshot,
          ohlcv: assetData.ohlcv,
          indicators: assetData.indicators,
          quote: assetData.quote,
        };

        // Run agents
        const agentResults = await runAllAgents(payloadInput);

        let approvedCount = 0;
        let suppressedCount = 0;
        const signals: any[] = [];

        for (const result of agentResults) {
          if (result.response === 'NO_SIGNAL' || typeof result.response === 'string') {
            suppressedCount++;
            continue;
          }

          const signal = result.response;
          const riskResult = await applyRiskFilters(signal);

          if (riskResult.approved) {
            if (!dryRun) {
              await saveSignal(signal);
              approvedCount++;
              signals.push(signal);
            }
          } else {
            suppressedCount++;
          }
        }

        // Save scan cycle
        if (!dryRun) {
          await saveScanCycle({
            timestamp: new Date(),
            asset: scanAsset,
            timeframe: config.scan.primaryTimeframe,
            agentResponses: agentResults.map((r: any) => ({
              agentId: r.agentId,
              response: r.response,
              responseTimeMs: r.responseTimeMs,
              error: r.error,
            })),
            approvedSignals: approvedCount,
            suppressedSignals: suppressedCount,
          }, Date.now() - cycleStart);
        }

        scanResults.push({
          asset: scanAsset,
          approved: approvedCount,
          suppressed: suppressedCount,
          signals,
        });

        logger.info({
          msg: `Manual scan complete for ${scanAsset}`,
          approved: approvedCount,
          suppressed: suppressedCount,
          durationMs: Date.now() - cycleStart,
        });
      }

      res.json({
        success: true,
        assetsScanned: assetsToScan.length,
        results: scanResults,
        dryRun: dryRun || false,
      });
    } catch (error: any) {
      logger.error({ msg: 'Manual scan failed', error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(port, () => {
    logger.info({ msg: 'Dashboard API server started', port });
  });
}
