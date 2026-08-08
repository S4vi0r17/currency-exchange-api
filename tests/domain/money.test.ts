import { describe, expect, it } from 'bun:test';
import { roundToCents, roundToRatePrecision } from '@/domain/value-objects/money';

describe('roundToCents', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundToCents(100.126)).toBe(100.13);
    expect(roundToCents(100.124)).toBe(100.12);
  });
});

describe('roundToRatePrecision', () => {
  it('rounds to 4 decimal places', () => {
    expect(roundToRatePrecision(3.80345678)).toBe(3.8035);
  });
});
