import { describe, expect, it } from 'vitest';
import {
  applyCover, applyRules, autoFile, coverCap, deleteGoal, everydayLeft, fillUsual, groupLeft,
  monthlySaving, normalizeCover, readyToAssign, refile, rollOver, safeToSpend, spentIn, viewEnvelopes,
} from './budget';
import type { Account, Envelope, Goal, Txn } from './types';

const M = '2026-11';
const env = (id: string, group: string, budget: number): Envelope => ({ id, name: id, group, budget, target: 0, color: '#000' });
const txn = (id: string, envelopeId: string | null, amount: number, over: Partial<Txn> = {}): Txn => ({
  id, envelopeId, merchant: 'Nomin Supermarket', amount, type: 'spend', date: '2026-11-03', accountId: 'a1', source: 'gmail', ...over,
});

// The numbers from the Plan screenshot.
const envelopes: Envelope[] = [
  env('dining', 'Everyday', 80000), env('groceries', 'Everyday', 700000),
  env('transport', 'Everyday', 100000), env('coffee', 'Everyday', 80000),
  env('rent', 'Bills', 1200000), env('phone', 'Bills', 0), env('internet', 'Bills', 50000),
];
const txns: Txn[] = [
  txn('t1', 'dining', 116200), txn('t2', 'groceries', 239400),
  txn('t3', 'transport', 15000), txn('t4', 'coffee', 62000),
];

describe('left / spent', () => {
  it('derives spent per month and ignores income and other months', () => {
    const all = [...txns, txn('x', 'dining', 5000, { type: 'income' }), txn('y', 'dining', 7000, { date: '2026-10-30' })];
    expect(spentIn(all, 'dining', M)).toBe(116200);
  });
  it('marks overspent as negative left', () => {
    const v = viewEnvelopes(envelopes, txns, M);
    expect(v.find((e) => e.id === 'dining')!.left).toBe(-36200);
  });
});

describe('group totals and safe to spend (matches the Plan screenshot)', () => {
  const v = viewEnvelopes(envelopes, txns, M);
  it('group header is signed: Everyday 527,400 / Bills 1,250,000', () => {
    expect(groupLeft(v, 'Everyday')).toBe(527400);
    expect(groupLeft(v, 'Bills')).toBe(1250000);
  });
  it('everyday left ignores overspent envelopes', () => {
    expect(everydayLeft(v)).toBe(460600 + 85000 + 18000);
  });
  it('safe to spend today = 20,800 on day 3 of 30', () => {
    const s = safeToSpend(everydayLeft(v), 3, 30, 2);
    expect(s.today).toBe(20800);
    expect(s.month).toBe(563600);
  });
  it('week = today × days left this week, capped by the month', () => {
    expect(safeToSpend(563600, 3, 30, 2).week).toBe(20800 * 5); // Wed → Sun
    expect(safeToSpend(563600, 30, 30, 0).week).toBe(safeToSpend(563600, 30, 30, 0).today); // last day
  });
  it('never divides by zero on the last day', () => {
    expect(safeToSpend(100000, 30, 30, 6).today).toBe(100000);
  });
});

describe('Ready to Assign', () => {
  const accounts: Account[] = [
    { id: 'a1', name: 'M bank', kind: 'Checking', balance: 3000000, syncOk: true },
    { id: 'a2', name: 'Card', kind: 'Credit', balance: -900000, syncOk: true },
  ];
  const goals: Goal[] = [{ id: 'g1', name: 'Cake stand', saved: 100000, target: 500000, monthly: 50000, addedThisMonth: 0, by: '2027-10' }];
  it('is accounts minus money that has a job; credit is not money', () => {
    const v = viewEnvelopes(envelopes, [], M);
    // envelopes hold 80+700+100+80 k + 1.2M + 0 + 50k = 2,210,000; goals 100,000
    expect(readyToAssign(accounts, v, goals)).toBe(3000000 - 2210000 - 100000);
  });
  it('deleting a goal returns its money to Ready to Assign', () => {
    const v = viewEnvelopes(envelopes, [], M);
    const before = readyToAssign(accounts, v, goals);
    expect(readyToAssign(accounts, v, deleteGoal(goals, 'g1'))).toBe(before + 100000);
  });
});

describe('cover', () => {
  it('caps each source at min(what it has, need − other sources)', () => {
    expect(coverCap(500000, 36200, 0)).toBe(36200);
    expect(coverCap(10000, 36200, 0)).toBe(10000);
    expect(coverCap(500000, 36200, 30000)).toBe(6200);
    expect(coverCap(500000, 36200, 40000)).toBe(0);
  });
  it('supports multiple sources and partial covers', () => {
    const has = () => 20000;
    const out = normalizeCover(
      [{ kind: 'rta', amount: 99999 }, { kind: 'envelope', envelopeId: 'coffee', amount: 99999 }], 36200, has);
    expect(out.map((s) => s.amount)).toEqual([20000, 16200]);
    const partial = normalizeCover([{ kind: 'rta', amount: 99999 }], 36200, () => 10000);
    expect(partial[0].amount).toBe(10000);
  });
  it('moves money from sources into the overspent envelope and lowers Ready to Assign', () => {
    const accounts: Account[] = [{ id: 'a1', name: 'M', kind: 'Checking', balance: 3000000, syncOk: true }];
    const before = readyToAssign(accounts, viewEnvelopes(envelopes, txns, M), []);
    const covered = applyCover(envelopes, 'dining', [{ kind: 'envelope', envelopeId: 'coffee', amount: 16200 }, { kind: 'rta', amount: 20000 }]);
    const v = viewEnvelopes(covered, txns, M);
    expect(v.find((e) => e.id === 'dining')!.left).toBe(0);
    expect(v.find((e) => e.id === 'coffee')!.left).toBe(18000 - 16200);
    expect(readyToAssign(accounts, v, [])).toBe(before - 20000);
  });
});

describe('rollover', () => {
  it('rolls leftovers forward and resets overspent to 0', () => {
    const next = rollOver(viewEnvelopes(envelopes, txns, M));
    expect(next.find((e) => e.id === 'groceries')!.budget).toBe(460600);
    expect(next.find((e) => e.id === 'dining')!.budget).toBe(0);
    expect(viewEnvelopes(next, txns, '2026-12').find((e) => e.id === 'groceries')!.left).toBe(460600);
  });
});

describe('transactions', () => {
  it('re-filing moves spending from the old envelope to the new one', () => {
    const moved = refile(txns, 't2', 'coffee');
    expect(spentIn(moved, 'groceries', M)).toBe(0);
    expect(spentIn(moved, 'coffee', M)).toBe(62000 + 239400);
  });
  it('merchant rules auto-file future matching payments, case-insensitively', () => {
    const rules = [{ merchant: 'nomin supermarket', envelopeId: 'groceries' }];
    expect(applyRules(txn('n', null, 100), rules)).toBe('groceries');
    const filed = autoFile([txn('n', null, 100), txn('m', null, 100, { merchant: 'Cafe' })], rules);
    expect(filed.map((t) => t.envelopeId)).toEqual(['groceries', null]);
  });
});

describe('yearly costs and fill', () => {
  it('monthly saving = yearly ÷ 12 rounded to 100', () => {
    expect(monthlySaving(600000)).toBe(50000);
    expect(monthlySaving(250000)).toBe(20800);
  });
  it('fills in order until money runs out and reports the shortfall', () => {
    const r = fillUsual(1000, [{ id: 'a', amount: 600 }, { id: 'b', amount: 600 }, { id: 'c', amount: 300 }]);
    expect(r.filled).toEqual({ a: 600, b: 0, c: 300 });
    expect(r.shortfall).toBe(600);
    expect(r.remaining).toBe(100);
  });
});

import { behindBy, goalReached, monthsToGoal, monthlyNeeded, spentByDay } from './budget';

describe('goals', () => {
  const g: Goal = { id: 'g', name: 'Trip', saved: 1000000, target: 7000000, monthly: 0, addedThisMonth: 0, by: '2027-10' };
  it('counts months through the target month, inclusive', () => {
    expect(monthsToGoal('2026-11', '2027-10')).toBe(12);
    expect(monthsToGoal('2026-11', '2026-11')).toBe(1);
    expect(monthsToGoal('2026-11', '2026-01')).toBe(1);
  });
  it('works out what to add each month, and how far behind this month is', () => {
    expect(monthlyNeeded(g, '2026-11')).toBe(500000);
    expect(behindBy(g, '2026-11')).toBe(500000);
    expect(behindBy({ ...g, addedThisMonth: 500000, saved: 1500000 }, '2026-11')).toBe(0);
  });
  it('knows when a goal is reached', () => {
    expect(goalReached({ ...g, saved: 7000000 })).toBe(true);
    expect(goalReached(g)).toBe(false);
  });
});

describe('spentByDay', () => {
  it('sums spending per day of the month', () => {
    const days = spentByDay([txn('a', 'x', 100), txn('b', 'x', 50), txn('c', 'x', 25, { date: '2026-11-05' }), txn('d', 'x', 9, { type: 'income' })], M);
    expect(days).toEqual({ 3: 150, 5: 25 });
  });
});
