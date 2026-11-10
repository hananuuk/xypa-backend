import { describe, it, expect } from 'vitest';
import { groupDigits, pressKey, spokenParts, usualFromCategories } from './amountInput';

describe('amountInput', () => {
  it('groups digits in threes', () => {
    expect(groupDigits('1')).toBe('1');
    expect(groupDigits('1234')).toBe('1,234');
    expect(groupDigits('12345678')).toBe('12,345,678');
  });
  it('ignores a leading zero, caps the length and deletes', () => {
    expect(pressKey('', '0')).toBe('');
    expect(pressKey('', '5')).toBe('5');
    expect(pressKey('12', '0')).toBe('120');
    expect(pressKey('123456789', '1')).toBe('123456789');
    expect(pressKey('12', 'back')).toBe('1');
    expect(pressKey('', 'back')).toBe('');
  });
  it('splits an amount into million / thousand / rest', () => {
    expect(spokenParts(2_500_000)).toEqual({ million: 2, thousand: 500, rest: 0 });
    expect(spokenParts(1_234)).toEqual({ million: 0, thousand: 1, rest: 234 });
  });
  it('splits the monthly amount across the chosen categories', () => {
    const u = usualFromCategories(['Groceries', 'Coffee', 'Taxi'], 1_000_000);
    expect(u.map((x) => x.monthly)).toEqual([333_000, 333_000, 333_000]);
    expect(new Set(u.map((x) => x.id)).size).toBe(3);
    expect(usualFromCategories([], 500_000)).toEqual([]);
  });
});
