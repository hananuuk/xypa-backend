import { fillUsual, monthlySaving } from './budget';
import type { Account, AccountKind, Envelope } from './types';
import { palette } from '../design/tokens';

export type Regular = { id: string; name: string; kind: 'Loan' | 'Bill' | 'Subscription'; monthly: number; note: string; on: boolean };
export type Usual = { id: string; name: string; monthly: number; payments?: number; on: boolean };
export type Yearly = { id: string; name: string; when: string; perYear: number; on: boolean };
export type DraftAccount = { id: string; name: string; kind: AccountKind; balance: number; note?: string };
export type Draft = { accounts: DraftAccount[]; cash: number; regular: Regular[]; usual: Usual[]; yearly: Yearly[] };

export const YEARLY_PRESETS: Yearly[] = [
  { id: 'tsagaan-sar', name: 'Tsagaan Sar', when: 'February', perYear: 600000, on: false },
  { id: 'naadam', name: 'Naadam', when: 'July', perYear: 300000, on: false },
  { id: 'school', name: 'School fees', when: 'September', perYear: 1200000, on: false },
  { id: 'gifts', name: 'Birthdays & gifts', when: 'All year', perYear: 480000, on: false },
  { id: 'car', name: 'Car insurance', when: 'Once a year', perYear: 600000, on: false },
  { id: 'holiday', name: 'A holiday trip', when: 'Summer', perYear: 1500000, on: false },
  { id: 'winter', name: 'Winter clothes', when: 'Autumn', perYear: 400000, on: false },
];

export const emptyDraft = (): Draft => ({ accounts: [], cash: 0, regular: [], usual: [], yearly: YEARLY_PRESETS.map((y) => ({ ...y })) });

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const moneyToPlan = (d: Draft) => sum(d.accounts.map((a) => a.balance)) + d.cash;
export const regularTotal = (d: Draft) => sum(d.regular.filter((r) => r.on).map((r) => r.monthly));
export const yearlyMonthly = (d: Draft) => sum(d.yearly.filter((y) => y.on).map((y) => monthlySaving(y.perYear)));
export const usualTotal = (d: Draft) => sum(d.usual.filter((u) => u.on).map((u) => u.monthly));
export const monthCost = (d: Draft) => regularTotal(d) + yearlyMonthly(d) + usualTotal(d);

/** Everything the user kept, as ordered envelope wants: regular, then yearly, then everyday. */
export function wants(d: Draft): { id: string; name: string; group: string; amount: number }[] {
  return [
    ...d.regular.filter((r) => r.on).map((r) => ({ id: `reg-${r.id}`, name: r.name, group: 'Bills', amount: r.monthly })),
    ...d.yearly.filter((y) => y.on).map((y) => ({ id: `yr-${y.id}`, name: y.name, group: 'Once in a while', amount: monthlySaving(y.perYear) })),
    ...d.usual.filter((u) => u.on).map((u) => ({ id: `use-${u.id}`, name: u.name, group: 'Everyday', amount: u.monthly })),
  ];
}

export const prefill = (d: Draft) => Object.fromEntries(wants(d).map((w) => [w.id, w.amount])) as Record<string, number>;
export const fillWhatFits = (d: Draft) => fillUsual(moneyToPlan(d), wants(d));
export const assignedTotal = (a: Record<string, number>) => sum(Object.values(a));

/** Turn the finished draft into real accounts and envelopes. */
export function buildPlan(d: Draft, assigned: Record<string, number>): { accounts: Account[]; envelopes: Envelope[] } {
  const accounts: Account[] = [
    ...d.accounts.map((a) => ({ id: a.id, name: a.name, kind: a.kind, balance: a.balance, syncOk: true } as Account)),
    { id: 'cash', name: 'Cash', kind: 'Wallet', balance: d.cash, syncOk: true } as Account,
  ];
  const envelopes: Envelope[] = wants(d).map((w, i) => ({
    id: w.id, name: w.name, group: w.group, budget: assigned[w.id] ?? 0, target: w.amount, color: palette[i % palette.length],
  }));
  return { accounts, envelopes };
}
