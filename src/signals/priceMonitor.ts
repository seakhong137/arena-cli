/**
 * Price Monitor
 * Polls MCP for price updates and checks TP/SL hits on OPEN signals
 */

import { getQuote } from '../mcp/client.js';
import { getOpenSignals, updateSignalStatus } from '../signals/signalDb.js';
import { sendOutcomeAlert } from '../telegram/bot.js';
import { getLogger } from '../shared/logger.js';
import type { Signal } from '../shared/types.js';

let monitorInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the price monitoring loop
 * Runs every `intervalMinutes` during and outside NY session
 */
export function startPriceMonitor(intervalMinutes = 1): void {
  const logger = getLogger();

  if (monitorInterval) {
    logger.warn('Price monitor already running');
    return;
  }

  logger.info({
    msg: '📈 Price monitor started',
    intervalMinutes,
  });

  monitorInterval = setInterval(async () => {
    await checkOpenSignals();
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stop the price monitoring loop
 */
export function stopPriceMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    getLogger().info('Price monitor stopped');
  }
}

/**
 * Check all OPEN signals for TP/SL hits
 */
async function checkOpenSignals(): Promise<void> {
  const logger = getLogger();

  const openSignals = await getOpenSignals();
  if (!openSignals.length) {
    return;
  }

  logger.debug({ msg: 'Checking open signals', count: openSignals.length });

  // Group signals by asset to minimize quote calls
  const assets = [...new Set(openSignals.map((s) => s.asset))];

  for (const asset of assets) {
    try {
      const quote = await getQuote(asset);
      if (!quote) continue;

      const currentPrice = quote.last || quote.close;
      if (!currentPrice) continue;

      // Check all open signals for this asset
      const assetSignals = openSignals.filter((s) => s.asset === asset);

      for (const signal of assetSignals) {
        await checkSignalOutcome(signal, currentPrice);
      }
    } catch (error: any) {
      logger.error({ msg: `Failed to check price for ${asset}`, error: error.message });
    }
  }
}

/**
 * Check if a single signal has hit TP or SL
 */
async function checkSignalOutcome(signal: Signal, currentPrice: number): Promise<void> {
  const logger = getLogger();

  if (signal.direction === 'BUY') {
    // Check TP hit
    if (currentPrice >= signal.take_profit_1) {
      logger.info({
        msg: 'TP HIT',
        agentId: signal.agent_id,
        asset: signal.asset,
        direction: signal.direction,
        entryPrice: signal.entry,
        tpPrice: signal.take_profit_1,
        currentPrice,
      });

      const pnlPips = calculatePips(signal, signal.take_profit_1, 'BUY');
      const pnlPercent = ((signal.take_profit_1 - signal.entry) / signal.entry) * 100;

      await updateSignalStatus(
        signal.agent_id + '-' + signal.timestamp,
        'TP_HIT',
        signal.take_profit_1,
        pnlPips,
        pnlPercent
      );

      await sendOutcomeAlert(signal, 'TP_HIT');
    }
    // Check SL hit
    else if (currentPrice <= signal.stop_loss) {
      logger.info({
        msg: 'SL HIT',
        agentId: signal.agent_id,
        asset: signal.asset,
        direction: signal.direction,
        entryPrice: signal.entry,
        slPrice: signal.stop_loss,
        currentPrice,
      });

      const pnlPips = calculatePips(signal, signal.stop_loss, 'BUY');
      const pnlPercent = ((signal.stop_loss - signal.entry) / signal.entry) * 100;

      await updateSignalStatus(
        signal.agent_id + '-' + signal.timestamp,
        'SL_HIT',
        signal.stop_loss,
        pnlPips,
        pnlPercent
      );

      await sendOutcomeAlert(signal, 'SL_HIT');
    }
  } else if (signal.direction === 'SELL') {
    // Check TP hit (price drops to TP for sell)
    if (currentPrice <= signal.take_profit_1) {
      logger.info({
        msg: 'TP HIT',
        agentId: signal.agent_id,
        asset: signal.asset,
        direction: signal.direction,
        entryPrice: signal.entry,
        tpPrice: signal.take_profit_1,
        currentPrice,
      });

      const pnlPips = calculatePips(signal, signal.take_profit_1, 'SELL');
      const pnlPercent = ((signal.entry - signal.take_profit_1) / signal.entry) * 100;

      await updateSignalStatus(
        signal.agent_id + '-' + signal.timestamp,
        'TP_HIT',
        signal.take_profit_1,
        pnlPips,
        pnlPercent
      );

      await sendOutcomeAlert(signal, 'TP_HIT');
    }
    // Check SL hit (price rises to SL for sell)
    else if (currentPrice >= signal.stop_loss) {
      logger.info({
        msg: 'SL HIT',
        agentId: signal.agent_id,
        asset: signal.asset,
        direction: signal.direction,
        entryPrice: signal.entry,
        slPrice: signal.stop_loss,
        currentPrice,
      });

      const pnlPips = calculatePips(signal, signal.stop_loss, 'SELL');
      const pnlPercent = ((signal.entry - signal.stop_loss) / signal.entry) * 100;

      await updateSignalStatus(
        signal.agent_id + '-' + signal.timestamp,
        'SL_HIT',
        signal.stop_loss,
        pnlPips,
        pnlPercent
      );

      await sendOutcomeAlert(signal, 'SL_HIT');
    }
  }

  // Check expiry (24h old)
  const signalAge = Date.now() - new Date(signal.timestamp).getTime();
  if (signalAge > 24 * 60 * 60 * 1000) {
    logger.info({
      msg: 'Signal expired',
      agentId: signal.agent_id,
      asset: signal.asset,
      age: `${Math.round(signalAge / (60 * 60 * 1000))}h`,
    });

    await updateSignalStatus(
      signal.agent_id + '-' + signal.timestamp,
      'EXPIRED'
    );

    await sendOutcomeAlert(signal, 'EXPIRED');
  }
}

/**
 * Calculate pip movement for a signal
 */
function calculatePips(signal: Signal, exitPrice: number, direction: 'BUY' | 'SELL'): number {
  const isForex = signal.asset.includes('USD') || signal.asset.includes('JPY');
  const pipMultiplier = signal.asset.includes('JPY') ? 100 : 10000;

  if (direction === 'BUY') {
    return (exitPrice - signal.entry) * pipMultiplier;
  } else {
    return (signal.entry - exitPrice) * pipMultiplier;
  }
}
