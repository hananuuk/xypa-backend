import { describe, expect, it } from 'vitest';
import { everydayLeft, groupLeft, readyToAssign, safeToSpend, viewEnvelopes } from '../logic/budget';
import { getToday } from './calendar';
import { seedAccounts, seedEnvelopes, seedGoals, seedTxns } from './seed';

describe('seed data matches the Plan screenshot', () => {
  const today = getToday(new Date(2026, 10, 3)); // 3 Nov 2026
  const v = viewEnvelopes(seedEnvelopes, seedTxns(today), today.month);
  it('Ready to Assign is 420,000₮', () => expect(readyToAssign(seedAccounts, v, seedGoals)).toBe(420000));
  it('Dining Out is overspent by 36,200₮', () => expect(v.find((e) => e.id === 'dining')!.left).toBe(-36200));
  it('group totals', () => {
    expect(groupLeft(v, 'Everyday')).toBe(527400);
    expect(groupLeft(v, 'Bills')).toBe(1250000);
  });
  it('safe to spend today is 20,800₮ on day 3 of 30', () => {
    expect(today.day).toBe(3);
    expect(safeToSpend(everydayLeft(v), today.day, today.monthDays, today.weekday).today).toBe(20800);
  });
  it('three payments wait for review', () => expect(seedTxns(today).filter((t) => t.envelopeId === null)).toHaveLength(3));
});
