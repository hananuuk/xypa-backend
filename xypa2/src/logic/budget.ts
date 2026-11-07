import type { Account, CoverSource, Envelope, Goal, MerchantRule, Txn } from './types';
import { roundDown100, roundNearest100 } from './money';

// ---------- spending & balances ----------

/** Total spent from an envelope in a given month (YYYY-MM). Income never counts as spending. */
export function spentIn(txns: Txn[], envelopeId: string, month: string): number {
  return txns
    .filter((t) => t.envelopeId === envelopeId && t.type === 'spend' && t.date.startsWith(month))
    .reduce((s, t) => s + t.amount, 0);
}

/** left = budget − spent. Overspent means left < 0. */
export const left = (budget: number, spent: number) => budget - spent;

/** Money still needed to hit the monthly target. */
export const needs = (target: number, budget: number) => Math.max(0, target - budget);

/** Money that is actually in bank/cash/savings accounts (credit and loans are debts, not money). */
export function moneyInAccounts(accounts: Account[]): number {
  return accounts
    .filter((a) => a.kind === 'Checking' || a.kind === 'Wallet' || a.kind === 'Savings')
    .reduce((s, a) => s + a.balance, 0);
}

export type EnvelopeView = Envelope & { spent: number; left: number };

export function viewEnvelopes(envelopes: Envelope[], txns: Txn[], month: string): EnvelopeView[] {
  return envelopes.map((e) => {
    const spent = spentIn(txns, e.id, month);
    return { ...e, spent, left: left(e.budget, spent) };
  });
}

/**
 * Ready to Assign = money in accounts − money that already has a job.
 *
 * Account balances are already net of spending, so "money that has a job" is what is *left*
 * in each envelope (budget − spent), plus money saved in goals. Using the signed `left` is what
 * makes Cover work: moving money from Ready to Assign into an overspent envelope lowers it.
 */
export function readyToAssign(accounts: Account[], envelopes: EnvelopeView[], goals: Goal[]): number {
  const inEnvelopes = envelopes.reduce((s, e) => s + e.left, 0);
  const inGoals = goals.reduce((s, g) => s + g.saved, 0);
  return moneyInAccounts(accounts) - inEnvelopes - inGoals;
}

// ---------- safe to spend ----------

/** Everyday left: overspent envelopes count as 0. Bills and goals are never included. */
export function everydayLeft(envelopes: EnvelopeView[]): number {
  return envelopes.filter((e) => e.group === 'Everyday').reduce((s, e) => s + Math.max(0, e.left), 0);
}

export type SafeToSpend = { today: number; week: number; month: number };

/**
 * @param day        day of month, 1-based (3 = "Day 3")
 * @param monthDays  days in the month
 * @param weekday    0 = Monday … 6 = Sunday
 */
export function safeToSpend(everyday: number, day: number, monthDays: number, weekday: number): SafeToSpend {
  const daysLeft = Math.max(1, monthDays - day); // "27 days to go" on day 3 of 30; never divide by 0
  const today = roundDown100(everyday / daysLeft);
  const daysLeftThisWeek = Math.min(7 - weekday, Math.max(1, monthDays - day + 1)); // today through Sunday
  return { today, week: today * daysLeftThisWeek, month: roundDown100(everyday) };
}

// ---------- cover ----------

/** The most one source can give: min(what it has, need − what the other sources already give). */
export function coverCap(has: number, need: number, otherSources: number): number {
  return Math.max(0, Math.min(has, need - otherSources));
}

/** Clamp every requested source amount to its cap, in order. Returns the clamped sources. */
export function normalizeCover(
  sources: CoverSource[],
  need: number,
  has: (s: CoverSource) => number,
): CoverSource[] {
  const out: CoverSource[] = [];
  let given = 0;
  for (const s of sources) {
    const amount = Math.max(0, Math.min(s.amount, coverCap(has(s), need, given)));
    out.push({ ...s, amount });
    given += amount;
  }
  return out;
}

/** Applies a cover: envelope sources lose budget, the overspent envelope gains the total. */
export function applyCover(envelopes: Envelope[], targetId: string, sources: CoverSource[]): Envelope[] {
  const total = sources.reduce((s, x) => s + x.amount, 0);
  return envelopes.map((e) => {
    if (e.id === targetId) return { ...e, budget: e.budget + total };
    const src = sources.find((s) => s.kind === 'envelope' && s.envelopeId === e.id);
    return src ? { ...e, budget: e.budget - src.amount } : e;
  });
}

// ---------- month rollover ----------

/**
 * New month: leftovers roll into the same envelope; overspent envelopes start from 0
 * (the overspend is absorbed by Ready to Assign). Only new income then needs assigning.
 * Transactions are not touched — spent is derived per month.
 */
export function rollOver(envelopes: EnvelopeView[]): Envelope[] {
  return envelopes.map(({ spent: _spent, left: l, ...e }) => ({ ...e, budget: Math.max(0, l) }));
}

// ---------- transactions ----------

/** Re-filing needs no bookkeeping: spent is derived from txns, so old loses it and new gains it. */
export function refile(txns: Txn[], txnId: string, envelopeId: string | null): Txn[] {
  return txns.map((t) => (t.id === txnId ? { ...t, envelopeId } : t));
}

export function applyRules(txn: Txn, rules: MerchantRule[]): string | null {
  const rule = rules.find((r) => r.merchant.toLowerCase() === txn.merchant.toLowerCase());
  return rule ? rule.envelopeId : txn.envelopeId;
}

/** Newly arrived txns get filed by merchant rules; the rest wait in Review. */
export function autoFile(txns: Txn[], rules: MerchantRule[]): Txn[] {
  return txns.map((t) => (t.envelopeId === null ? { ...t, envelopeId: applyRules(t, rules) } : t));
}

// ---------- goals, yearly costs ----------

/** Deleting a goal gives its saved money back: it simply stops counting in readyToAssign. */
export const deleteGoal = (goals: Goal[], id: string) => goals.filter((g) => g.id !== id);

/** Monthly saving for a yearly cost, rounded to the nearest 100₮. */
export const monthlySaving = (perYear: number) => roundNearest100(perYear / 12);

/** Average of the last months' totals (used for spending suggestions). */
export const average = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/**
 * "Fill with usual amounts": fill in order until money runs out; report the shortfall.
 * `wants` is already ordered (regular, then yearly, then everyday).
 */
export function fillUsual(available: number, wants: { id: string; amount: number }[]) {
  let remaining = Math.max(0, available);
  const filled: Record<string, number> = {};
  let shortfall = 0;
  for (const w of wants) {
    if (w.amount <= remaining) {
      filled[w.id] = w.amount;
      remaining -= w.amount;
    } else {
      filled[w.id] = 0;
      shortfall += w.amount;
    }
  }
  return { filled, remaining, shortfall };
}

/** Group header total ("EVERYDAY · 527,400₮ left"): signed, so overspent envelopes subtract. */
export const groupLeft = (envelopes: EnvelopeView[], group: string) =>
  envelopes.filter((e) => e.group === group).reduce((s, e) => s + e.left, 0);

// ---------- goals ----------

/** Whole months from `month` through the goal's target month, counting both ends (min 1). */
export function monthsToGoal(month: string, by: string): number {
  const m = (s: string) => parseInt(s.slice(0, 4), 10) * 12 + parseInt(s.slice(5, 7), 10);
  return Math.max(1, m(by) - m(month) + 1);
}

/** What has to be added each month to reach the target by the target month. */
export function monthlyNeeded(g: Goal, month: string): number {
  return Math.max(0, Math.ceil((g.target - g.saved + g.addedThisMonth) / monthsToGoal(month, g.by) / 100) * 100);
}

/** How much more to add this month to stay on track (0 = on track). */
export function behindBy(g: Goal, month: string): number {
  return Math.max(0, monthlyNeeded(g, month) - g.addedThisMonth);
}

export const goalReached = (g: Goal) => g.saved >= g.target;

// ---------- reflect ----------

/** Spend per day (spend only) for a month, keyed by day-of-month. */
export function spentByDay(txns: Txn[], month: string): Record<number, number> {
  const out: Record<number, number> = {};
  for (const t of txns) {
    if (t.type === 'spend' && t.date.startsWith(month)) out[parseInt(t.date.slice(8, 10), 10)] = (out[parseInt(t.date.slice(8, 10), 10)] ?? 0) + t.amount;
  }
  return out;
}
