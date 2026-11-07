import { describe, expect, it } from 'vitest';
import { readyToAssign, safeToSpend, viewEnvelopes, everydayLeft } from './budget';
import { assignedTotal, buildPlan, Draft, emptyDraft, fillWhatFits, monthCost, moneyToPlan, prefill, wants, yearlyMonthly } from './onboarding';

// Spec screenshots: 2,830,000 to plan with, 3,118,900 month costs, 288,900 short.
const draft = (): Draft => ({
  ...emptyDraft(),
  accounts: [{ id: 'mb', name: 'M bank', kind: 'Checking', balance: 2350000 }, { id: 'gl', name: 'Golomt', kind: 'Checking', balance: 480000 }],
  regular: [
    { id: 'rent', name: 'Rent', kind: 'Bill', monthly: 1200000, note: '', on: true },
    { id: 'loan', name: 'Khan Bank loan', kind: 'Loan', monthly: 450000, note: '', on: true },
    { id: 'unitel', name: 'Unitel', kind: 'Bill', monthly: 40000, note: '', on: true },
    { id: 'univ', name: 'Univision', kind: 'Bill', monthly: 50000, note: '', on: true },
    { id: 'nf', name: 'Netflix', kind: 'Subscription', monthly: 12900, note: '', on: true },
    { id: 'gym', name: 'Gym membership', kind: 'Subscription', monthly: 90000, note: '', on: true },
  ],
  usual: [
    { id: 'groc', name: 'Groceries', monthly: 652000, on: true }, { id: 'shop', name: 'Shopping', monthly: 180000, on: true },
    { id: 'dine', name: 'Dining Out', monthly: 128000, on: true }, { id: 'tr', name: 'Transport', monthly: 92000, on: true },
    { id: 'cof', name: 'Coffee', monthly: 74000, on: true }, { id: 'fun', name: 'Fun money', monthly: 60000, on: true },
  ],
});

describe('onboarding maths', () => {
  it('matches the screenshot totals', () => {
    const d = draft();
    d.yearly = d.yearly.map((y) => (y.id === 'tsagaan-sar' || y.id === 'gifts' ? { ...y, on: true } : y));
    expect(moneyToPlan(d)).toBe(2830000);
    expect(yearlyMonthly(d)).toBe(90000);
    expect(monthCost(d)).toBe(3118900);
    expect(wants(d)).toHaveLength(14);
  });
  it('fills only what fits and reports the shortfall', () => {
    const d = draft();
    d.yearly = d.yearly.map((y) => (y.id === 'tsagaan-sar' || y.id === 'gifts' ? { ...y, on: true } : y));
    const r = fillWhatFits(d);
    expect(r.filled['use-dine']).toBe(0); // dining 128,000 > the 65,100 left, so skipped
    expect(r.shortfall).toBeGreaterThan(0);
  });
  it('builds a plan whose Ready to Assign equals money minus assigned', () => {
    const d = draft();
    const assigned = prefill(d);
    const { accounts, envelopes } = buildPlan(d, assigned);
    const views = viewEnvelopes(envelopes, [], '2026-11');
    expect(readyToAssign(accounts, views, [])).toBe(moneyToPlan(d) - assignedTotal(assigned));
    const s = safeToSpend(everydayLeft(views), 7, 30, 5);
    expect(s.today).toBe(Math.floor(1186000 / 23 / 100) * 100);
  });
});
