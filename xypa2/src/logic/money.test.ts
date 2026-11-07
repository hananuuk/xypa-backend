import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney } from './money';

describe('formatMoney', () => {
  it('uses comma thousands, no decimals, ₮ after', () => {
    expect(formatMoney(1200000)).toBe('1,200,000₮');
    expect(formatMoney(0)).toBe('0₮');
    expect(formatMoney(950)).toBe('950₮');
  });
  it('uses a real minus sign for negatives', () => {
    expect(formatMoney(-36200)).toBe('−36,200₮');
  });
  it('masks hidden amounts', () => {
    expect(formatMoney(1200000, { hidden: true })).toBe('••••₮');
  });
});

describe('parseMoney', () => {
  it('strips separators', () => {
    expect(parseMoney('1,200,000')).toBe(1200000);
    expect(parseMoney('36 200₮')).toBe(36200);
    expect(parseMoney('')).toBe(0);
  });
});

import { setCurrency } from './money';
describe('currency symbol', () => {
  it('switches symbol and position, then restores', () => {
    setCurrency('USD');
    expect(formatMoney(1200000)).toBe('$1,200,000');
    expect(formatMoney(5, { hidden: true })).toBe('$••••');
    setCurrency('MNT');
    expect(formatMoney(-36200)).toBe('−36,200₮');
  });
});
