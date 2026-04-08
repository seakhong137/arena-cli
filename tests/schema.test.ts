import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SignalSchema } from '../src/shared/types.js';

describe('Signal Schema Validation', () => {
  it('should validate a complete signal object', () => {
    const validSignal = {
      agent_id: 'AGENT-01',
      strategy: 'ICT Concepts',
      timestamp: '2025-01-15T10:35:00-05:00',
      asset: 'FX:XAUUSD',
      timeframe: '5M',
      direction: 'BUY' as const,
      entry: 2645.50,
      stop_loss: 2641.00,
      take_profit_1: 2652.00,
      take_profit_2: 2658.50,
      risk_reward_ratio: 2.3,
      position_size_pct: 1.0,
      confidence_pct: 78,
      session: 'New York',
      rationale: 'Price swept sell-side liquidity below prior NY low',
      invalidation: 'Close below 2640.50',
      status: 'OPEN' as const,
    };

    const result = SignalSchema.safeParse(validSignal);
    expect(result.success).toBe(true);
  });

  it('should reject signal with invalid direction', () => {
    const invalidSignal = {
      agent_id: 'AGENT-01',
      strategy: 'ICT',
      timestamp: '2025-01-15T10:35:00-05:00',
      asset: 'XAUUSD',
      timeframe: '5M',
      direction: 'HOLD',
      entry: 2645.50,
      stop_loss: 2641.00,
      take_profit_1: 2652.00,
      risk_reward_ratio: 2.3,
      confidence_pct: 78,
      session: 'New York',
      rationale: 'Test',
      invalidation: 'Test',
    };

    const result = SignalSchema.safeParse(invalidSignal);
    expect(result.success).toBe(false);
  });

  it('should reject signal with negative entry price', () => {
    const invalidSignal = {
      agent_id: 'AGENT-01',
      strategy: 'ICT',
      timestamp: '2025-01-15T10:35:00-05:00',
      asset: 'XAUUSD',
      timeframe: '5M',
      direction: 'BUY',
      entry: -100,
      stop_loss: 2641.00,
      take_profit_1: 2652.00,
      risk_reward_ratio: 2.3,
      confidence_pct: 78,
      session: 'New York',
      rationale: 'Test',
      invalidation: 'Test',
    };

    const result = SignalSchema.safeParse(invalidSignal);
    expect(result.success).toBe(false);
  });

  it('should reject signal with confidence > 100', () => {
    const invalidSignal = {
      agent_id: 'AGENT-01',
      strategy: 'ICT',
      timestamp: '2025-01-15T10:35:00-05:00',
      asset: 'XAUUSD',
      timeframe: '5M',
      direction: 'BUY',
      entry: 2645.50,
      stop_loss: 2641.00,
      take_profit_1: 2652.00,
      risk_reward_ratio: 2.3,
      confidence_pct: 150,
      session: 'New York',
      rationale: 'Test',
      invalidation: 'Test',
    };

    const result = SignalSchema.safeParse(invalidSignal);
    expect(result.success).toBe(false);
  });

  it('should accept signal without optional take_profit_2', () => {
    const validSignal = {
      agent_id: 'AGENT-01',
      strategy: 'ICT',
      timestamp: '2025-01-15T10:35:00-05:00',
      asset: 'XAUUSD',
      timeframe: '5M',
      direction: 'BUY' as const,
      entry: 2645.50,
      stop_loss: 2641.00,
      take_profit_1: 2652.00,
      risk_reward_ratio: 2.3,
      position_size_pct: 1.0,
      confidence_pct: 78,
      session: 'New York',
      rationale: 'Test',
      invalidation: 'Test',
      status: 'OPEN' as const,
    };

    const result = SignalSchema.safeParse(validSignal);
    expect(result.success).toBe(true);
  });
});

describe('Response Parser', () => {
  function extractJson(text: string): string | null {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];
    return null;
  }

  it('should extract JSON from markdown code block', () => {
    const input = '```json\n{"agent_id": "AGENT-01", "direction": "BUY"}\n```';
    const result = extractJson(input);
    expect(result).toContain('"agent_id"');
  });

  it('should extract JSON from plain text', () => {
    const input = 'Here is the signal: {"agent_id": "AGENT-01", "direction": "BUY"} done';
    const result = extractJson(input);
    expect(result).toContain('"agent_id"');
  });

  it('should return null for non-JSON text', () => {
    const input = 'NO_SIGNAL — no setup detected';
    const result = extractJson(input);
    expect(result).toBeNull();
  });
});
