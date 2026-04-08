/**
 * Telegram Bot
 * Sends formatted alert messages to Telegram channel/group
 */

import { Telegraf } from 'telegraf';
import { loadConfig } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import type { Signal } from '../shared/types.js';

let bot: Telegraf | null = null;

/**
 * Initialize Telegram bot
 */
export function initTelegram(): Telegraf | null {
  const config = loadConfig();
  const logger = getLogger();

  if (!config.telegram.enabled || !config.telegram.botToken) {
    logger.warn('Telegram not configured — alerts disabled');
    return null;
  }

  bot = new Telegraf(config.telegram.botToken);

  // Basic error handling
  bot.catch((err) => {
    logger.error({ msg: 'Telegram bot error', error: err });
  });

  // Admin commands
  bot.command('leaderboard', async (ctx) => {
    ctx.reply('📊 Leaderboard command received — dashboard integration pending');
  });

  bot.command('pause', async (ctx) => {
    ctx.reply('⏸️ Pause command received — agent management pending');
  });

  bot.command('signals', async (ctx) => {
    ctx.reply('📋 Signals command received — signal query integration pending');
  });

  logger.info('✅ Telegram bot initialized');

  return bot;
}

/**
 * Send a new signal alert
 */
export async function sendSignalAlert(signal: Signal): Promise<void> {
  const config = loadConfig();
  const logger = getLogger();

  if (!bot || !config.telegram.enabled) {
    logger.debug('Telegram not configured — skipping signal alert');
    return;
  }

  const directionEmoji = signal.direction === 'BUY' ? '🟢' : '🔴';
  const slDistance = Math.abs(signal.entry - signal.stop_loss).toFixed(2);

  const message = `🤖 SIGNAL ALERT — THE ARENA

📊 Agent: ${signal.agent_id} (${signal.strategy})
💱 Asset: ${signal.asset} | ${signal.timeframe} | ${signal.session} Session
📈 Direction: ${directionEmoji} ${signal.direction}
⏰ Time: ${new Date(signal.timestamp).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} EST

📌 Entry: ${signal.entry}
🛑 Stop Loss: ${signal.stop_loss} (−${slDistance} pts)
🎯 TP1: ${signal.take_profit_1}${signal.take_profit_2 ? `\n🎯 TP2: ${signal.take_profit_2}` : ''}
⚖️ R:R: 1:${signal.risk_reward_ratio}

💡 Confidence: ${signal.confidence_pct}%
🔒 Risk: ${signal.position_size_pct}% of account

📝 Rationale:
${signal.rationale}

❌ Invalidation: ${signal.invalidation}

⚠️ Not financial advice. Educational use only.`;

  try {
    await bot.telegram.sendMessage(config.telegram.chatId, message, {
      parse_mode: 'HTML',
    });
    logger.info({ msg: 'Signal alert sent', agentId: signal.agent_id, asset: signal.asset });
  } catch (error: any) {
    logger.error({ msg: 'Failed to send signal alert', error: error.message });
  }
}

/**
 * Send TP/SL hit notification
 */
export async function sendOutcomeAlert(
  signal: Signal,
  outcome: 'TP_HIT' | 'SL_HIT' | 'EXPIRED'
): Promise<void> {
  const config = loadConfig();
  const logger = getLogger();

  if (!bot || !config.telegram.enabled) return;

  let emoji: string;
  let text: string;

  switch (outcome) {
    case 'TP_HIT':
      emoji = '✅';
      text = `${emoji} TP HIT — ${signal.agent_id} ${signal.asset} ${signal.direction} @ ${signal.take_profit_1}`;
      break;
    case 'SL_HIT':
      emoji = '❌';
      text = `${emoji} SL HIT — ${signal.agent_id} ${signal.asset} ${signal.direction} @ ${signal.stop_loss}`;
      break;
    case 'EXPIRED':
      emoji = '⏰';
      text = `${emoji} EXPIRED — ${signal.agent_id} ${signal.asset} ${signal.direction} (24h timeout)`;
      break;
  }

  try {
    await bot.telegram.sendMessage(config.telegram.chatId, text);
    logger.info({ msg: 'Outcome alert sent', agentId: signal.agent_id, outcome });
  } catch (error: any) {
    logger.error({ msg: 'Failed to send outcome alert', error: error.message });
  }
}

/**
 * Send session start notification
 */
export async function sendSessionStart(): Promise<void> {
  const config = loadConfig();
  const logger = getLogger();

  if (!bot || !config.telegram.enabled) return;

  try {
    await bot.telegram.sendMessage(config.telegram.chatId, '🔔 NY Session open. Agents active.');
    logger.info('Session start alert sent');
  } catch (error: any) {
    logger.error({ msg: 'Failed to send session start alert', error: error.message });
  }
}

/**
 * Send session end notification with daily summary
 */
export async function sendSessionEnd(dailyStats: {
  totalSignals: number;
  approvedSignals: number;
  suppressedSignals: number;
}): Promise<void> {
  const config = loadConfig();
  const logger = getLogger();

  if (!bot || !config.telegram.enabled) return;

  const message = `🌙 NY Session closed. Daily summary:

📊 Total signals generated: ${dailyStats.totalSignals}
✅ Approved: ${dailyStats.approvedSignals}
🚫 Suppressed: ${dailyStats.suppressedSignals}

See dashboard for detailed breakdown.`;

  try {
    await bot.telegram.sendMessage(config.telegram.chatId, message);
    logger.info('Session end alert sent');
  } catch (error: any) {
    logger.error({ msg: 'Failed to send session end alert', error: error.message });
  }
}

/**
 * Send elimination notification
 */
export async function sendEliminationAlert(
  eliminatedAgent: string,
  newAgent: string
): Promise<void> {
  const config = loadConfig();
  const logger = getLogger();

  if (!bot || !config.telegram.enabled) return;

  const message = `⚔️ ${eliminatedAgent} eliminated. New agent ${newAgent} deployed.`;

  try {
    await bot.telegram.sendMessage(config.telegram.chatId, message);
    logger.info({ msg: 'Elimination alert sent', eliminatedAgent, newAgent });
  } catch (error: any) {
    logger.error({ msg: 'Failed to send elimination alert', error: error.message });
  }
}
