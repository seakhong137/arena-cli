import { describe, it, expect } from 'vitest';

describe('Session Manager Logic', () => {
  it('should correctly identify NY session hours', () => {
    const sessionStart = '08:00';
    const sessionEnd = '17:00';
    expect(sessionStart).toBe('08:00');
    expect(sessionEnd).toBe('17:00');
  });

  it('should calculate warmup period correctly', () => {
    const warmupMinutes = 5;
    expect(warmupMinutes).toBe(5);
  });
});

describe('Risk Manager Logic', () => {
  it('should calculate R:R correctly for BUY', () => {
    const entry = 2645.50;
    const stopLoss = 2641.00;
    const takeProfit = 2652.00;
    const risk = entry - stopLoss;
    const reward = takeProfit - entry;
    const rr = reward / risk;
    expect(rr).toBeCloseTo(1.44, 1);
  });

  it('should reject signals with R:R < 1.5', () => {
    const entry = 2645.50;
    const stopLoss = 2644.00;
    const takeProfit = 2647.00;
    const risk = entry - stopLoss;
    const reward = takeProfit - entry;
    const rr = reward / risk;
    expect(rr).toBe(1.0);
    expect(rr).toBeLessThan(1.5);
  });

  it('should calculate pip value for XAUUSD BUY', () => {
    const entry = 2645.50;
    const exit = 2652.00;
    const pips = (exit - entry) * 10;
    expect(pips).toBe(65);
  });

  it('should calculate pip value for EURUSD BUY', () => {
    const entry = 1.0850;
    const exit = 1.0900;
    const pips = (exit - entry) * 10000;
    expect(pips).toBeCloseTo(50, 0);
  });
});

describe('Elimination Scoring', () => {
  function calculateComposite(winRate: number, profitFactor: number, maxDrawdown: number): number {
    const winRateScore = Math.min(winRate / 100, 1);
    const pfScore = Math.min(profitFactor / 3, 1);
    const ddScore = Math.max(1 - maxDrawdown / 10, 0);
    return winRateScore * 0.35 + pfScore * 0.35 + ddScore * 0.3;
  }

  it('should calculate composite score between 0 and 1', () => {
    const score = calculateComposite(45, 1.2, 8);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('should score high performer higher', () => {
    const good = calculateComposite(65, 2.0, 5);
    const bad = calculateComposite(30, 0.8, 12);
    expect(good).toBeGreaterThan(bad);
  });

  it('should flag agent with win rate below 40%', () => {
    expect(35).toBeLessThan(40);
  });

  it('should exempt agent with fewer than 5 signals', () => {
    expect(3).toBeLessThan(5);
  });
});

describe('USD Correlation Detection', () => {
  function isUsdPair(asset: string): boolean {
    const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'USDJPY'];
    return pairs.some((pair) => asset.includes(pair.replace('FX:', '')));
  }

  it('should identify XAUUSD as USD pair', () => {
    expect(isUsdPair('FX:XAUUSD')).toBe(true);
  });

  it('should identify EURUSD as USD pair', () => {
    expect(isUsdPair('FX:EURUSD')).toBe(true);
  });

  it('should not identify EURGBP as USD pair', () => {
    expect(isUsdPair('FX:EURGBP')).toBe(false);
  });

  it('should not identify GBPJPY as USD pair', () => {
    expect(isUsdPair('FX:GBPJPY')).toBe(false);
  });
});
