/**
 * Agent Runner
 * Invokes Gemini API with system prompt + user payload
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { loadConfig, getRootDir } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import type { AgentPayload } from '../mcp/payloadBuilder.js';
import type { AgentResponse, Signal } from '../shared/types.js';
import { SignalSchema } from '../shared/types.js';

/**
 * Run a single agent via Gemini API
 */
export async function runAgent(
  agentId: string,
  payload: AgentPayload,
  model?: string,
  timeoutSeconds?: number,
  verbose = false
): Promise<{
  response: AgentResponse;
  responseTimeMs: number;
  error?: string;
  rawOutput?: string;
}> {
  const config = loadConfig();
  const logger = getLogger();
  const rootDir = getRootDir();
  const startTime = Date.now();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const geminiModel = model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const timeout = (timeoutSeconds || config.scan.agentTimeoutSeconds) * 1000;

  logger.info({
    msg: `Running agent: ${agentId}`,
    model: geminiModel,
    timeout: `${timeout / 1000}s`,
  });

  // Build text-only prompt
  const promptContent = buildGeminiPrompt({
    systemPrompt: payload.systemPrompt,
    userPrompt: payload.userPrompt,
  });

  try {
    // Call Gemini API
    const result = await callGeminiApi(apiKey, geminiModel, promptContent, timeout);

    const responseTimeMs = Date.now() - startTime;

    // Parse the response
    const parsed = parseAgentResponse(result.output);

    if (verbose) {
      logger.info({
        msg: `Agent ${agentId} verbose output`,
        rawOutput: result.output || '(empty)',
      });
    }

    logger.info({
      msg: `Agent ${agentId} complete`,
      responseTimeMs,
      hasSignal: parsed !== 'NO_SIGNAL',
    });

    return {
      response: parsed,
      responseTimeMs,
      rawOutput: result.output?.substring(0, 1000),
    };
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    logger.error({
      msg: `Agent ${agentId} failed`,
      error: error.message,
      responseTimeMs,
    });

    return {
      response: 'NO_SIGNAL',
      responseTimeMs,
      error: error.message,
    };
  }
}

/**
 * Build the text prompt for Gemini API
 */
function buildGeminiPrompt(payload: AgentPayload): string {
  let content = `<system>\n${payload.systemPrompt}\n</system>\n\n`;
  content += payload.userPrompt;
  return content;
}

/**
 * Call Gemini API and capture output
 */
async function callGeminiApi(
  apiKey: string,
  model: string,
  promptContent: string,
  timeout: number
): Promise<{ output: string }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptContent }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    clearTimeout(timeoutId);
    const response = await result.response;
    const output = response.text();

    return { output };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Agent timed out after ${timeout / 1000}s`);
    }
    throw error;
  }
}

/**
 * Parse agent response: extract Signal JSON or detect NO_SIGNAL
 * Also handles markdown table format and free-text signals
 */
function parseAgentResponse(output: string): AgentResponse {
  const logger = getLogger();

  // Check for explicit NO_SIGNAL
  if (output.trim().toUpperCase() === 'NO_SIGNAL' || output.trim().toUpperCase() === 'NO_SIGNAL (CHOPPY)') {
    return 'NO_SIGNAL';
  }

  // Try to extract JSON from output
  const jsonMatch = extractJson(output);
  if (jsonMatch) {
    try {
      let parsed = JSON.parse(jsonMatch);
      // Map agent output format to SignalSchema format
      if (parsed.signal) {
        parsed.direction = parsed.signal === 'LONG' ? 'BUY' : 'SELL';
        delete parsed.signal;
      }
      // Map field names: sl → stop_loss, tp1 → take_profit_1, etc.
      if (parsed.sl !== undefined) { parsed.stop_loss = parsed.sl; delete parsed.sl; }
      if (parsed.tp1 !== undefined) { parsed.take_profit_1 = parsed.tp1; delete parsed.tp1; }
      if (parsed.tp2 !== undefined) { parsed.take_profit_2 = parsed.tp2; delete parsed.tp2; }
      if (parsed.rr !== undefined) { parsed.risk_reward_ratio = parsed.rr; delete parsed.rr; }
      if (parsed.entry === undefined && parsed.price) { parsed.entry = parsed.price; delete parsed.price; }
      // Add defaults for missing fields
      if (!parsed.agent_id) parsed.agent_id = 'UNKNOWN';
      if (!parsed.strategy) parsed.strategy = 'UNKNOWN';
      if (!parsed.asset) parsed.asset = 'UNKNOWN';
      if (!parsed.timeframe) parsed.timeframe = '5M';
      if (!parsed.session) parsed.session = 'New York';
      if (!parsed.status) parsed.status = 'OPEN';
      if (!parsed.position_size_pct) parsed.position_size_pct = 1.0;
      if (!parsed.confidence_pct) parsed.confidence_pct = parsed.checklistScore ? Math.min(parsed.checklistScore * 15, 95) : 55;
      if (!parsed.timestamp) parsed.timestamp = new Date().toISOString();
      if (!parsed.invalidation) parsed.invalidation = `Close beyond ${parsed.stop_loss || 'N/A'}`;
      if (!parsed.rationale) parsed.rationale = parsed.narrative || output.substring(0, 200);

      const result = SignalSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
      logger.warn({ msg: 'Schema validation failed', errors: result.error.errors.slice(0, 3) });
    } catch {
      // Continue to text parsing
    }
  }

  // Try to extract signal from markdown table format
  const textSignal = extractSignalFromText(output);
  if (textSignal) {
    return textSignal;
  }

  // Check if output contains signal-like content
  if (/signal.*(short|long|buy|sell)/i.test(output) && /entry.*\d/i.test(output)) {
    const textSignal2 = extractSignalFromText(output);
    if (textSignal2) return textSignal2;
  }

  logger.warn({ msg: 'Failed to parse agent response as JSON', output: output.substring(0, 200) });
  return 'NO_SIGNAL';
}

/**
 * Extract signal parameters from markdown/text output
 */
function extractSignalFromText(output: string): Signal | null {
  // Match markdown table format: | Entry | 4763.00 |
  const entryMatch = output.match(/\|\s*Entry\s*\|\s*([\d.]+)/);
  const slMatch = output.match(/\|\s*SL\s*\|\s*([\d.]+)/);
  const tp1Match = output.match(/\|\s*TP1\s*\|\s*([\d.]+)/);
  const tp2Match = output.match(/\|\s*TP2\s*\|\s*([\d.]+)/);
  const rrMatch = output.match(/\|\s*R:[Rr]\s*\|\s*([\d.]+)/);

  // Also match inline format: Entry: 4763.00, SL: 4773.50
  const entryInline = output.match(/[Ee]ntry\s*[:=]\s*([\d.]+)/);
  const slInline = output.match(/[Ss]top\s+[Ll]oss\s*[:=]\s*([\d.]+)|\|\s*SL\s*\|\s*([\d.]+)/);
  const tp1Inline = output.match(/[Tt][Pp]1\s*[:=]\s*([\d.]+)/);

  const entry = entryMatch || entryInline;
  const sl = slMatch || slInline;
  const tp1 = tp1Match || tp1Inline;
  const rr = rrMatch;
  const direction = output.match(/\*\*(SHORT|LONG)\*\*|(SHORT|long|LONG|short)\s*signal|signal\s*confirmed.*?(SHORT|LONG)/i);

  if (entry && sl && tp1 && direction) {
    const entryVal = parseFloat(entry[1].replace(/,/g, ''));
    const slVal = parseFloat((sl[1] || sl[2] || '0').replace(/,/g, ''));
    const tp1Val = parseFloat(tp1[1].replace(/,/g, ''));
    const rrVal = rr ? parseFloat(rr[1]) : Math.abs((tp1Val - entryVal) / Math.abs(entryVal - slVal));
    const dir = (direction[1] || direction[2] || direction[3] || '').toUpperCase() === 'SHORT' ? 'SELL' : 'BUY';
    const tp2Val = tp2Match ? parseFloat(tp2Match[1].replace(/,/g, '')) : (dir === 'BUY' ? entryVal + (tp1Val - entryVal) * 1.5 : entryVal - (entryVal - tp1Val) * 1.5);

    // Extract narrative from output
    const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('|') && !l.startsWith('##') && !l.startsWith('**Step'));
    const narrative = lines.slice(0, 3).join(' ').substring(0, 300);

    return {
      agent_id: 'UNKNOWN',
      strategy: 'UNKNOWN',
      timestamp: new Date().toISOString(),
      asset: 'UNKNOWN',
      timeframe: '5M',
      direction: dir as 'BUY' | 'SELL',
      entry: entryVal,
      stop_loss: slVal,
      take_profit_1: tp1Val,
      take_profit_2: tp2Val,
      risk_reward_ratio: rrVal || Math.round((Math.abs(tp1Val - entryVal) / Math.abs(entryVal - slVal)) * 100) / 100,
      position_size_pct: 1.0,
      confidence_pct: 55,
      session: 'New York',
      rationale: narrative || 'Signal extracted from text output',
      invalidation: `Close beyond ${slVal}`,
      status: 'OPEN',
    };
  }

  return null;
}

/**
 * Extract JSON from text (handles markdown code blocks, etc.)
 */
function extractJson(text: string): string | null {
  // Try to find JSON in markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}

/**
 * Test a single agent (for CLI testing)
 */
export async function testAgent(agentId: string, asset: string): Promise<any> {
  const logger = getLogger();
  logger.info(`Testing ${agentId} on ${asset}...`);

  // TODO: This needs the full MCP integration
  // For now, return a placeholder
  return {
    agentId,
    asset,
    status: 'TEST_MODE — full MCP integration required',
  };
}
