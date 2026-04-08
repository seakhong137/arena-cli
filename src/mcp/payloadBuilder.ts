/**
 * Payload Builder
 * Packages chart data (screenshot + OHLCV + indicators) into agent input format
 */

import { getLogger } from '../shared/logger.js';

export interface AgentPayload {
  systemPrompt: string;
  userPrompt: string;
  imageBase64?: string;
}

export interface PayloadInput {
  asset: string;
  currentTime: string;
  session: string;
  screenshot: string;
  ohlcv: any[];
  indicators: Record<string, any>;
  quote: any;
}

/**
 * Build the user prompt payload for an agent
 */
export function buildAgentPayload(
  input: PayloadInput,
  systemPrompt: string
): AgentPayload {
  const logger = getLogger();

  // Format OHLCV summary (last 10 candles for context)
  const recentOhlcv = input.ohlcv.slice(-10);
  const ohlcvSummary = recentOhlcv
    .map(
      (candle) =>
        `Time: ${candle.time || 'N/A'} | O: ${candle.open} | H: ${candle.high} | L: ${candle.low} | C: ${candle.close} | V: ${candle.volume || 'N/A'}`
    )
    .join('\n');

  // Format indicators
  const indicatorsText = Object.entries(input.indicators)
    .map(([name, values]) => {
      const valStr = typeof values === 'object'
        ? Object.entries(values as Record<string, unknown>)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        : String(values);
      return `- ${name}: ${valStr}`;
    })
    .join('\n');

  // Build user prompt
  const userPrompt = `Asset: ${input.asset}
Current Time (EST): ${input.currentTime}
Session: ${input.session}

Chart Image: [base64 image provided below]

OHLCV (last 10 candles):
${ohlcvSummary}

Indicators:
${indicatorsText || 'No indicators loaded'}

Current Quote:
${input.quote ? `Price: ${input.quote.last || 'N/A'} | Change: ${input.quote.change || 'N/A'} (${input.quote.change_percent || 'N/A'}%)` : 'No quote data'}

Respond with Signal JSON or NO_SIGNAL.`;

  logger.debug({
    msg: 'Agent payload built',
    asset: input.asset,
    ohlcvCandles: input.ohlcv.length,
    indicatorCount: Object.keys(input.indicators).length,
  });

  return {
    systemPrompt,
    userPrompt,
    imageBase64: input.screenshot,
  };
}

/**
 * Format OHLCV data for the prompt with key levels
 */
export function extractKeyLevels(ohlcv: any[]): {
  high: number;
  low: number;
  open: number;
  close: number;
  range: number;
  avgVolume: number;
} {
  if (!ohlcv.length) {
    return { high: 0, low: 0, open: 0, close: 0, range: 0, avgVolume: 0 };
  }

  const highs = ohlcv.map((c) => c.high);
  const lows = ohlcv.map((c) => c.low);
  const volumes = ohlcv.map((c) => c.volume || 0);

  return {
    high: Math.max(...highs),
    low: Math.min(...lows),
    open: ohlcv[0]?.open || 0,
    close: ohlcv[ohlcv.length - 1]?.close || 0,
    range: Math.max(...highs) - Math.min(...lows),
    avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
  };
}
