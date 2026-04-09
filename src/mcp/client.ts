/**
 * TradingView MCP Client
 * Communicates with the TradingView MCP server via stdio
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join } from 'path';
import { loadConfig, getRootDir } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';

let mcpClient: Client | null = null;
let transport: StdioClientTransport | null = null;

/**
 * Initialize connection to TradingView MCP server
 */
export async function connectMcp(): Promise<Client> {
  if (mcpClient) return mcpClient;

  const logger = getLogger();

  // Use absolute path — TradingView MCP must be at this location
  const mcpDir = process.env.MCP_SERVER_DIR || '/Users/khong/ai-cli/tradingview-mcp';

  logger.info({ msg: 'Connecting to TradingView MCP server', dir: mcpDir });

  transport = new StdioClientTransport({
    command: 'node',
    args: [join(mcpDir, 'src', 'server.js')],
    cwd: mcpDir,
  });

  mcpClient = new Client(
    {
      name: 'arena-cli',
      version: '0.1.0',
    },
    {
      capabilities: {},
    }
  );

  await mcpClient.connect(transport);

  logger.info('✅ TradingView MCP connected');

  return mcpClient;
}

/**
 * Close MCP connection
 */
export async function disconnectMcp(): Promise<void> {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
    transport = null;
  }
}

/**
 * Get chart screenshot as base64
 */
export async function getChartScreenshot(
  symbol: string,
  timeframe: string
): Promise<string> {
  const client = await connectMcp();

  // Set symbol
  await client.callTool({
    name: 'chart_set_symbol',
    arguments: { symbol },
  });

  // Set timeframe
  await client.callTool({
    name: 'chart_set_timeframe',
    arguments: { timeframe },
  });

  // Capture screenshot
  const screenshotResult = await client.callTool({
    name: 'capture_screenshot',
    arguments: { region: 'chart', method: 'cdp' },
  });

  // Extract base64 from result
  const content = (screenshotResult as any).content?.[0];
  if (content?.data) {
    return content.data;
  }
  if (content?.text) {
    return content.text;
  }

  throw new Error('Failed to capture screenshot');
}

/**
 * Get OHLCV data for a symbol/timeframe
 */
export async function getOhlcv(
  symbol: string,
  timeframe: string,
  count = 100
): Promise<any[]> {
  const client = await connectMcp();

  // Set symbol and timeframe first
  await client.callTool({
    name: 'chart_set_symbol',
    arguments: { symbol },
  });

  await client.callTool({
    name: 'chart_set_timeframe',
    arguments: { timeframe },
  });

  const result = await client.callTool({
    name: 'data_get_ohlcv',
    arguments: { count, summary: false },
  });

  return (result as any).content?.[0]?.text
    ? JSON.parse((result as any).content[0].text)
    : [];
}

/**
 * Get indicator values for visible studies
 */
export async function getIndicatorValues(): Promise<Record<string, any>> {
  const client = await connectMcp();

  const result = await client.callTool({
    name: 'data_get_study_values',
    arguments: {},
  });

  const text = (result as any).content?.[0]?.text;
  return text ? JSON.parse(text) : {};
}

/**
 * Get real-time quote for a symbol
 */
export async function getQuote(symbol?: string): Promise<any> {
  const client = await connectMcp();

  const result = await client.callTool({
    name: 'quote_get',
    arguments: { symbol: symbol || '' },
  });

  const text = (result as any).content?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

/**
 * Get current chart state (symbol, timeframe, indicators)
 */
export async function getChartState(): Promise<any> {
  const client = await connectMcp();

  const result = await client.callTool({
    name: 'chart_get_state',
    arguments: {},
  });

  const text = (result as any).content?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

/**
 * Full data fetch for a single asset (screenshot + OHLCV + indicators)
 */
export async function fetchAssetData(
  symbol: string,
  primaryTimeframe: string,
  contextTimeframes: string[] = [],
  ohlcvCount = 100
): Promise<{
  screenshot: string;
  ohlcv: any[];
  indicators: Record<string, any>;
  quote: any;
  chartState: any;
}> {
  const logger = getLogger();
  logger.info({ msg: 'Fetching asset data', symbol, timeframe: primaryTimeframe });

  // Set symbol and primary timeframe
  const client = await connectMcp();

  try {
    await client.callTool({
      name: 'chart_set_symbol',
      arguments: { symbol },
    });
  } catch (error: any) {
    logger.error({ msg: `Failed to set symbol ${symbol}`, error: error.message });
  }

  try {
    await client.callTool({
      name: 'chart_set_timeframe',
      arguments: { timeframe: primaryTimeframe },
    });
  } catch (error: any) {
    logger.error({ msg: `Failed to set timeframe ${primaryTimeframe}`, error: error.message });
  }

  // Fetch all data in parallel with error handling
  const results = await Promise.allSettled([
    client.callTool({
      name: 'capture_screenshot',
      arguments: { region: 'chart', method: 'cdp' },
    }),
    client.callTool({
      name: 'data_get_ohlcv',
      arguments: { count: ohlcvCount, summary: false },
    }),
    client.callTool({
      name: 'data_get_study_values',
      arguments: {},
    }),
    client.callTool({
      name: 'quote_get',
      arguments: { symbol },
    }),
    client.callTool({
      name: 'chart_get_state',
      arguments: {},
    }),
  ]);

  const screenshotResult = results[0];
  const ohlcvResult = results[1];
  const indicatorsResult = results[2];
  const quoteResult = results[3];
  const chartStateResult = results[4];

  function extractResult(r: PromiseSettledResult<any>): any {
    if (r.status === 'fulfilled') return r.value;
    logger.warn({ msg: 'MCP call rejected', reason: (r as PromiseRejectedResult).reason });
    return null;
  }

  function extractText(r: PromiseSettledResult<any>): string | null {
    if (r.status !== 'fulfilled') return null;
    const val = (r as PromiseFulfilledResult<any>).value;
    return val?.content?.[0]?.text || null;
  }

  function extractData(r: PromiseSettledResult<any>): string | null {
    if (r.status !== 'fulfilled') return null;
    const val = (r as PromiseFulfilledResult<any>).value;
    return val?.content?.[0]?.data || val?.content?.[0]?.text || null;
  }

  const screenshot = extractData(screenshotResult) || '';

  const ohlcvText = extractText(ohlcvResult);
  const ohlcvRaw = ohlcvText ? JSON.parse(ohlcvText) : null;

  // Extract bars array from MCP response (may be { bars: [...] } or [...] directly)
  const ohlcv = Array.isArray(ohlcvRaw)
    ? ohlcvRaw
    : (ohlcvRaw?.bars || ohlcvRaw?.data || ohlcvRaw?.candles || []);

  logger.info({
    msg: 'OHLCV fetch result',
    ohlcvLength: ohlcv.length,
    hasText: !!ohlcvText,
    textPreview: ohlcvText?.substring(0, 100) || '(empty)',
    rawType: ohlcvRaw ? typeof ohlcvRaw : 'null',
    rawKeys: ohlcvRaw && typeof ohlcvRaw === 'object' ? Object.keys(ohlcvRaw) : [],
  });

  const indicatorsText = extractText(indicatorsResult);
  const indicators = indicatorsText ? JSON.parse(indicatorsText) : {};

  const quoteText = extractText(quoteResult);
  const quote = quoteText ? JSON.parse(quoteText) : null;

  const chartStateText = extractText(chartStateResult);
  const chartState = chartStateText ? JSON.parse(chartStateText) : null;

  return {
    screenshot,
    ohlcv,
    indicators,
    quote,
    chartState,
  };
}
