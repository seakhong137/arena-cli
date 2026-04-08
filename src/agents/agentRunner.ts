/**
 * Agent Runner
 * Invokes qwen CLI with system prompt + user payload via child_process
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { loadConfig, getRootDir } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import type { AgentPayload } from '../mcp/payloadBuilder.js';
import type { AgentResponse } from '../shared/types.js';
import { SignalSchema } from '../shared/types.js';

/**
 * Run a single agent via qwen CLI
 */
export async function runAgent(
  agentId: string,
  payload: AgentPayload,
  model?: string,
  timeoutSeconds?: number
): Promise<{
  response: AgentResponse;
  responseTimeMs: number;
  error?: string;
}> {
  const config = loadConfig();
  const logger = getLogger();
  const rootDir = getRootDir();
  const startTime = Date.now();

  const cliPath = process.env.AI_CLI_PATH || 'qwen';
  const cliModel = model || process.env.AI_CLI_MODEL || 'qwen-vl-plus';
  const cliApproval = process.env.AI_CLI_APPROVAL_MODE || 'yolo';
  const timeout = (timeoutSeconds || config.scan.agentTimeoutSeconds) * 1000;

  logger.info({
    msg: `Running agent: ${agentId}`,
    model: cliModel,
    timeout: `${timeout / 1000}s`,
  });

  // Write payload to temp file for qwen CLI to read
  const tempDir = join(rootDir, 'data', 'temp');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const payloadFile = join(tempDir, `${agentId}-${randomUUID()}.json`);

  // Build the prompt for qwen CLI
  // qwen CLI doesn't directly accept base64 images via stdin, so we write to temp file
  const promptContent = buildQwenPrompt(payload);
  writeFileSync(payloadFile, promptContent, 'utf-8');

  try {
    // Run qwen CLI with the payload file
    const result = await runQwenCli(cliPath, cliModel, cliApproval, payloadFile, timeout);

    const responseTimeMs = Date.now() - startTime;

    // Parse the response
    const parsed = parseAgentResponse(result.stdout);

    logger.info({
      msg: `Agent ${agentId} complete`,
      responseTimeMs,
      hasSignal: parsed !== 'NO_SIGNAL',
    });

    return {
      response: parsed,
      responseTimeMs,
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
  } finally {
    // Cleanup temp file
    if (existsSync(payloadFile)) {
      unlinkSync(payloadFile);
    }
  }
}

/**
 * Build the prompt file content for qwen CLI
 * Includes system prompt + user payload + image reference
 */
function buildQwenPrompt(payload: AgentPayload): string {
  let content = `<system>\n${payload.systemPrompt}\n</system>\n\n`;
  content += payload.userPrompt;

  if (payload.imageBase64) {
    // Add image as base64 data reference
    content += `\n\n[Chart Image - base64 encoded]\n${payload.imageBase64}`;
  }

  return content;
}

/**
 * Run qwen CLI and capture output
 */
function runQwenCli(
  cliPath: string,
  model: string,
  approvalMode: string,
  payloadFile: string,
  timeout: number
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Agent timed out after ${timeout / 1000}s`));
    }, timeout);

    // Read payload file content and pass to qwen CLI
    const args = [
      '-p',
      `Please analyze the trading chart and respond with either a Signal JSON or NO_SIGNAL. Read the full prompt from: ${payloadFile}`,
      '--model',
      model,
      '--approval-mode',
      approvalMode,
    ];

    const child = spawn(cliPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({ stdout, stderr, code: code || 0 });
    });

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Parse agent response: extract Signal JSON or detect NO_SIGNAL
 */
function parseAgentResponse(output: string): AgentResponse {
  const logger = getLogger();

  // Check for NO_SIGNAL
  if (output.includes('NO_SIGNAL') || output.includes('NO SIGNAL')) {
    return 'NO_SIGNAL';
  }

  // Try to extract JSON from output
  const jsonMatch = extractJson(output);
  if (!jsonMatch) {
    logger.warn({ msg: 'Failed to parse agent response as JSON', output: output.slice(0, 200) });
    return 'NO_SIGNAL';
  }

  try {
    const parsed = JSON.parse(jsonMatch);

    // Validate against SignalSchema
    const result = SignalSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    logger.warn({
      msg: 'Signal validation failed',
      errors: result.error.errors,
    });

    return 'NO_SIGNAL';
  } catch (error) {
    logger.warn({ msg: 'JSON parse error', error });
    return 'NO_SIGNAL';
  }
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
