import express from 'express';
import cors from 'cors';
import { loadConfig, getRootDir } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import { getAllAgents, getOpenSignals, saveSignal, saveScanCycle } from '../signals/signalDb.js';
import { getChatMessages, saveChatMessage } from '../signals/chatDb.js';
import { fetchAssetData } from '../mcp/client.js';
import { runAllAgents, getActiveAgents } from '../agents/agentPool.js';
import { applyRiskFilters } from '../risk/riskManager.js';
import { runPreSignalDebate } from '../signals/chatEngine.js';
import { randomUUID } from 'crypto';
import { getState, pauseSystem, resumeSystem, setActiveScan } from '../shared/systemState.js';
import { saveScanResult, getAgentResults, getLatestResult, getAgentStats } from '../signals/scanResultsDb.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const logger = getLogger();
const config = loadConfig();

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// System state
app.get('/api/status', (_req, res) => {
  const state = getState();
  res.json(state);
});

app.post('/api/stop', (_req, res) => {
  const state = pauseSystem();
  logger.info({ msg: '⏸️ System paused', pausedAt: state.pausedAt });
  res.json({ success: true, state });
});

app.post('/api/resume', (_req, res) => {
  const state = resumeSystem();
  logger.info({ msg: '▶️ System resumed' });
  res.json({ success: true, state });
});

// Agent performance stats
app.get('/api/agent-stats', (_req, res) => {
  // TODO: Pull from DB - for now return empty
  res.json({ agents: {} });
});

// Update confluence threshold at runtime
app.post('/api/config/threshold', (req, res) => {
  try {
    const { threshold } = req.body;
    if (typeof threshold !== 'number' || threshold < 1 || threshold > 10) {
      return res.status(400).json({ error: 'Threshold must be a number between 1 and 10' });
    }
    // Update the config file
    const configPath = join(getRootDir(), 'config', 'settings.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    config.confluenceThreshold = threshold;
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    logger.info({ msg: '🎯 Confluence threshold updated', threshold });
    res.json({ success: true, threshold });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Agent scan results
app.get('/api/agent/:id/scan-results', async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const results = await getAgentResults(req.params.id, limit);
    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agent/:id/latest-result', async (req, res) => {
  try {
    const asset = (req.query.asset as string) || 'FX:XAUUSD';
    const result = await getLatestResult(req.params.id, asset);
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agent/:id/stats', async (req, res) => {
  try {
    const stats = await getAgentStats(req.params.id);
    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Chat
app.get('/api/chat', async (_req, res) => {
  try {
    const limit = parseInt((_req.query.limit as string) || '100', 10);
    const messages = await getChatMessages(limit);
    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const id = await saveChatMessage(req.body);
    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan trigger
app.post('/api/trigger-scan', async (req, res) => {
  try {
    const state = getState();
    if (state.paused) {
      return res.status(409).json({ error: 'System is paused. Resume to continue scanning.' });
    }

    setActiveScan(true);
    const { asset, dryRun, verbose, agents: maxAgents } = req.body || {};
    const assetsToScan = asset ? [asset] : config.scan.assets;
    const scanResults: any[] = [];

    logger.info({ msg: '🔔 Manual scan triggered', assets: assetsToScan, dryRun: dryRun || false, verbose: verbose || false });

    await saveChatMessage({
      agentId: null, agentName: 'System', type: 'system',
      content: `Manual scan triggered: ${assetsToScan.join(', ')}`,
      targetAgentId: null, targetAsset: null, scanCycleId: null,
    });

    for (const scanAsset of assetsToScan) {
      const cycleStart = Date.now();
      const assetData = await fetchAssetData(scanAsset, config.scan.primaryTimeframe, config.scan.contextTimeframes, config.scan.ohlcvCount);

      const scanCycleId = randomUUID();
      await saveChatMessage({
        agentId: null, agentName: 'System', type: 'system',
        content: `📊 Scan started for ${scanAsset}`,
        targetAgentId: null, targetAsset: scanAsset, scanCycleId,
      });

      const agentResults = await runAllAgents({
        asset: scanAsset, currentTime: new Date().toISOString(), session: 'New York',
        ohlcv: assetData.ohlcv, quote: assetData.quote,
      }, verbose || false, maxAgents);

      let approved = 0, suppressed = 0;
      const signals: any[] = [];

      for (const result of agentResults) {
        const isSignal = result.response !== 'NO_SIGNAL' && typeof result.response !== 'string';
        let riskApproved = false;

        if (isSignal) {
          const signal = result.response as any;
          const riskResult = await applyRiskFilters(signal);
          if (riskResult.approved) {
            if (!dryRun) { await saveSignal(signal); signals.push(signal); }
            approved++;
            riskApproved = true;
          } else { suppressed++; }
        } else {
          suppressed++;
        }

        // Save per-agent scan result
        if (!dryRun) {
          await saveScanResult({
            scanCycleId,
            agentId: result.agentId,
            agentName: result.strategy,
            asset: scanAsset,
            response: typeof result.response === 'string' ? result.response : JSON.stringify(result.response),
            isSignal,
            direction: isSignal ? (result.response as any).direction : null,
            entry: isSignal ? (result.response as any).entry : null,
            stopLoss: isSignal ? (result.response as any).stop_loss : null,
            takeProfit1: isSignal ? (result.response as any).take_profit_1 : null,
            riskRewardRatio: isSignal ? (result.response as any).risk_reward_ratio : null,
            confidence: isSignal ? (result.response as any).confidence_pct : null,
            rationale: isSignal ? (result.response as any).rationale : null,
            responseTimeMs: result.responseTimeMs,
            riskApproved,
          });
        }
      }

      if (!dryRun) {
        await saveScanCycle({
          timestamp: new Date(), asset: scanAsset, timeframe: config.scan.primaryTimeframe,
          agentResponses: agentResults.map((r: any) => ({ agentId: r.agentId, response: r.response, responseTimeMs: r.responseTimeMs, error: r.error })),
          approvedSignals: approved, suppressedSignals: suppressed,
        }, Date.now() - cycleStart);
      }

      scanResults.push({ asset: scanAsset, approved, suppressed, signals, agentDetails: verbose ? agentResults.map(r => ({ id: r.agentId, strategy: r.strategy, response: r.response, responseTimeMs: r.responseTimeMs, error: r.error })) : undefined });
      logger.info({ msg: `Scan complete for ${scanAsset}`, approved, suppressed });
    }

    res.json({ success: true, assetsScanned: assetsToScan.length, results: scanResults, dryRun, verbose: verbose || false });
  } catch (error: any) {
    setActiveScan(false);
    logger.error({ msg: 'Manual scan failed', error: error.message });
    res.status(500).json({ error: error.message });
  } finally {
    setActiveScan(false);
  }
});

const PORT = 3101;
app.listen(PORT, () => {
  console.log(`Arena API running on http://localhost:${PORT}`);
  logger.info({ msg: 'Arena API server started', port: PORT });
});
