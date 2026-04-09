/**
 * Payload Builder
 * Packages OHLCV candle data into agent input format.
 * Agents analyze raw price action — no indicator dependency.
 */

import { getLogger } from '../shared/logger.js';
import { loadConfig } from '../shared/config.js';

export interface AgentPayload {
  systemPrompt: string;
  userPrompt: string;
}

export interface PayloadInput {
  asset: string;
  currentTime: string;
  session: string;
  ohlcv: any[];
  quote: any;
}

/**
 * Build the user prompt payload for an agent
 * Includes 50 candles + calculated metrics so agents can analyze price action directly
 */
export function buildAgentPayload(
  input: PayloadInput,
  originalSystemPrompt: string
): AgentPayload {
  const logger = getLogger();
  const ohlcv = Array.isArray(input.ohlcv) ? input.ohlcv : [];

  // Calculate key metrics from raw OHLCV data
  const metrics = calculateMetrics(ohlcv);

  // Recent 10 candles for detailed view
  const recentCandles = ohlcv.slice(-10);
  const candleText = recentCandles
    .map((c, i) => {
      const body = Math.abs(c.close - c.open).toFixed(2);
      const wickUp = (c.high - Math.max(c.open, c.close)).toFixed(2);
      const wickDown = (Math.min(c.open, c.close) - c.low).toFixed(2);
      const dir = c.close >= c.open ? 'GREEN' : 'RED';
      return `#${i + 1} ${dir} | O:${c.open} H:${c.high} L:${c.low} C:${c.close} V:${c.volume || 0} | Body:${body} Wick↑:${wickUp} Wick↓:${wickDown}`;
    })
    .join('\n');

  // Build user prompt
  const userPrompt = `Asset: ${input.asset}
Current Time: ${input.currentTime}
Session: ${input.session}

═══════════════════════════════════════
RAW OHLCV DATA — Last 10 of ${ohlcv.length} Candles
═══════════════════════════════════════
${candleText}

═══════════════════════════════════════
CALCULATED METRICS (from ${ohlcv.length} candles)
═══════════════════════════════════════
Current Price: ${metrics.currentPrice}
Session High: ${metrics.sessionHigh}
Session Low: ${metrics.sessionLow}
Session Range: ${metrics.sessionRange.toFixed(2)}
Open Price: ${metrics.openPrice}
Net Change: ${metrics.netChange.toFixed(2)} (${metrics.pctChange.toFixed(2)}%)

Moving Averages:
  SMA(10): ${metrics.sma10.toFixed(2)} | Price vs SMA10: ${metrics.priceVsSma10 > 0 ? 'ABOVE' : 'BELOW'} by ${Math.abs(metrics.priceVsSma10).toFixed(2)}
  SMA(20): ${metrics.sma20.toFixed(2)} | Price vs SMA20: ${metrics.priceVsSma20 > 0 ? 'ABOVE' : 'BELOW'} by ${Math.abs(metrics.priceVsSma20).toFixed(2)}
  SMA(50): ${metrics.sma50.toFixed(2)} | Price vs SMA50: ${metrics.priceVsSma50 > 0 ? 'ABOVE' : 'BELOW'} by ${Math.abs(metrics.priceVsSma50).toFixed(2)}

ATR(14): ${metrics.atr14.toFixed(2)}
Avg Volume(20): ${metrics.avgVol20.toFixed(0)}
Last Candle Volume: ${metrics.lastVolume}
Volume Ratio: ${metrics.volRatio.toFixed(2)}x average

Momentum (last 5 closes): ${metrics.momentum5 > 0 ? 'BULLISH' : 'BEARISH'} (${metrics.momentum5.toFixed(2)})
Trend: ${metrics.trend}

Key Swing Points:
  Recent Swing Highs: ${metrics.swingHighs.map((s: number) => s.toFixed(2)).join(', ') || 'None detected'}
  Recent Swing Lows: ${metrics.swingLows.map((s: number) => s.toFixed(2)).join(', ') || 'None detected'}

Recent Candle Patterns:
${metrics.patterns.length > 0 ? metrics.patterns.map((p: string) => `  • ${p}`).join('\n') : '  No strong patterns detected'}

${input.quote ? `Real-time Quote: ${input.quote.last} | Change: ${input.quote.change} (${input.quote.change_percent}%)` : ''}

═══════════════════════════════════════
Analyze the price action above and return EITHER a valid Signal JSON OR exactly "NO_SIGNAL".
═══════════════════════════════════════`;

  logger.debug({
    msg: 'Agent payload built (OHLCV-only)',
    asset: input.asset,
    ohlcvCandles: ohlcv.length,
    trend: metrics.trend,
  });

  // Inject confluence threshold override into system prompt
  const config = loadConfig();
  const threshold = config.confluenceThreshold || 3;

  // Replace ALL threshold references in the system prompt
  let finalSystemPrompt = originalSystemPrompt
    // Replace "need X+ of Y" → "need {threshold}+"
    .replace(/need \d+\+ of \d+/gi, `need ${threshold}+`)
    // Replace "need X+ required items" → "need {threshold}+"
    .replace(/If \d+\+ required items/gi, `If ${threshold}+ required items`)
    // Replace "fewer than X required" → "fewer than {threshold}"
    .replace(/fewer than \d+ required/gi, `fewer than ${threshold} required`)
    // Replace "need X+ checklist" → "need {threshold}+"
    .replace(/If \d+\+ checklist/gi, `If ${threshold}+ checklist`)
    // Replace "If X+ items align" → "If {threshold}+ items align"
    .replace(/If \d+\+ items align/gi, `If ${threshold}+ items align`)
    // Replace "need MINIMUM X categories" → "need MINIMUM {threshold}"
    .replace(/need MINIMUM \d+/gi, `need MINIMUM ${threshold}`)
    // Replace "If X+ categories" → "If {threshold}+"
    .replace(/If \d+\+ categories/gi, `If ${threshold}+ categories`)
    // Replace "fewer than X categories" → "fewer than {threshold}"
    .replace(/fewer than \d+ categories/gi, `fewer than ${threshold} categories`)
    // Replace minimum R:R for testing (lower to 1.2 so agents can signal)
    .replace(/Minimum R:R: 1\.5/gi, `Minimum R:R: 1.2`)
    .replace(/Minimum R:R: [0-9.]+/gi, `Minimum R:R: 1.2`);

  // Add strong override instruction
  finalSystemPrompt += `\n\n⚠️ CRITICAL: If ${threshold}+ checklist items are true, you MUST output the signal JSON. Do NOT say NO_SIGNAL just because price moved. If entry requires a pullback, set entry at the pullback level and signal anyway. Your job is to identify setups, not wait for perfect entries.`;

  return {
    systemPrompt: finalSystemPrompt,
    userPrompt,
  };
}

/**
 * Calculate all metrics from raw OHLCV data
 */
function calculateMetrics(ohlcv: any[]) {
  if (!ohlcv.length) {
    return {
      currentPrice: 0, sessionHigh: 0, sessionLow: 0, sessionRange: 0,
      openPrice: 0, netChange: 0, pctChange: 0,
      sma10: 0, sma20: 0, sma50: 0, priceVsSma10: 0, priceVsSma20: 0, priceVsSma50: 0,
      atr14: 0, avgVol20: 0, lastVolume: 0, volRatio: 0,
      momentum5: 0, trend: 'UNKNOWN',
      swingHighs: [], swingLows: [], patterns: [],
    };
  }

  const closes = ohlcv.map(c => c.close);
  const highs = ohlcv.map(c => c.high);
  const lows = ohlcv.map(c => c.low);
  const volumes = ohlcv.map(c => c.volume || 0);
  const currentPrice = closes[closes.length - 1];

  // Session range
  const sessionHigh = Math.max(...highs);
  const sessionLow = Math.min(...lows);
  const sessionRange = sessionHigh - sessionLow;
  const openPrice = ohlcv[0].open;
  const netChange = currentPrice - openPrice;
  const pctChange = (netChange / openPrice) * 100;

  // Moving Averages
  const sma = (data: number[], period: number) => {
    if (data.length < period) return data[data.length - 1] || 0;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };

  const sma10 = sma(closes, 10);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, Math.min(50, closes.length));

  // ATR(14)
  let atr14 = 0;
  if (ohlcv.length >= 15) {
    const trueRanges = [];
    for (let i = Math.max(1, ohlcv.length - 14); i < ohlcv.length; i++) {
      const tr = Math.max(
        ohlcv[i].high - ohlcv[i].low,
        Math.abs(ohlcv[i].high - ohlcv[i - 1].close),
        Math.abs(ohlcv[i].low - ohlcv[i - 1].close)
      );
      trueRanges.push(tr);
    }
    atr14 = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  // Volume
  const avgVol20 = sma(volumes, Math.min(20, volumes.length));
  const lastVolume = volumes[volumes.length - 1];
  const volRatio = avgVol20 > 0 ? lastVolume / avgVol20 : 1;

  // Momentum
  const momentum5 = closes.length >= 6 ? closes[closes.length - 1] - closes[closes.length - 6] : 0;

  // Trend detection
  let trend = 'UNKNOWN';
  if (closes.length >= 20) {
    const last5 = closes.slice(-5);
    const prev5 = closes.slice(-10, -5);
    const avgLast5 = last5.reduce((a, b) => a + b, 0) / 5;
    const avgPrev5 = prev5.reduce((a, b) => a + b, 0) / 5;
    const slope = ((avgLast5 - avgPrev5) / avgPrev5) * 100;

    if (slope > 0.1 && currentPrice > sma20) trend = 'BULLISH';
    else if (slope < -0.1 && currentPrice < sma20) trend = 'BEARISH';
    else trend = 'RANGING';
  }

  // Swing points
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  for (let i = 2; i < ohlcv.length - 2; i++) {
    if (ohlcv[i].high > ohlcv[i - 1].high && ohlcv[i].high > ohlcv[i - 2].high &&
        ohlcv[i].high > ohlcv[i + 1].high && ohlcv[i].high > ohlcv[i + 2].high) {
      swingHighs.push(ohlcv[i].high);
    }
    if (ohlcv[i].low < ohlcv[i - 1].low && ohlcv[i].low < ohlcv[i - 2].low &&
        ohlcv[i].low < ohlcv[i + 1].low && ohlcv[i].low < ohlcv[i + 2].low) {
      swingLows.push(ohlcv[i].low);
    }
  }

  // Candle pattern detection
  const patterns: string[] = [];
  const recent = ohlcv.slice(-5);
  for (let i = 0; i < recent.length; i++) {
    const c = recent[i];
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;

    if (range > 0) {
      if (lowerWick > body * 2 && upperWick < body * 0.5) {
        patterns.push(`Hammer at ${c.low.toFixed(2)} (candle #${ohlcv.length - 4 + i})`);
      }
      if (upperWick > body * 2 && lowerWick < body * 0.5) {
        patterns.push(`Shooting Star at ${c.high.toFixed(2)} (candle #${ohlcv.length - 4 + i})`);
      }
      if (body < range * 0.1) {
        patterns.push(`Doji at ${c.close.toFixed(2)} (candle #${ohlcv.length - 4 + i})`);
      }
    }

    // Engulfing
    if (i > 0) {
      const prev = recent[i - 1];
      const prevBody = Math.abs(prev.close - prev.open);
      if (c.close > c.open && prev.close < prev.open && c.open <= prev.close && c.close >= prev.open && body > prevBody) {
        patterns.push(`Bullish Engulfing at ${c.close.toFixed(2)} (candle #${ohlcv.length - 4 + i})`);
      }
      if (c.close < c.open && prev.close > prev.open && c.open >= prev.close && c.close <= prev.open && body > prevBody) {
        patterns.push(`Bearish Engulfing at ${c.close.toFixed(2)} (candle #${ohlcv.length - 4 + i})`);
      }
    }
  }

  return {
    currentPrice, sessionHigh, sessionLow, sessionRange,
    openPrice, netChange, pctChange,
    sma10, sma20, sma50,
    priceVsSma10: currentPrice - sma10,
    priceVsSma20: currentPrice - sma20,
    priceVsSma50: currentPrice - sma50,
    atr14, avgVol20, lastVolume, volRatio,
    momentum5, trend,
    swingHighs: swingHighs.slice(-3),
    swingLows: swingLows.slice(-3),
    patterns,
  };
}
