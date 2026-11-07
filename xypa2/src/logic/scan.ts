import { roundNearest100 } from './money';
import type { Account, Envelope, Txn } from './types';
import type { Draft, DraftAccount, Regular, Usual } from './onboarding';
import { emptyDraft } from './onboarding';

/** One transaction read from an email or a statement. */
export type Found = {
  bank: string | null; card: string | null; merchant: string; amount: number;
  type: 'spend' | 'income'; date: string | null; balance: number | null; source?: 'gmail' | 'statement'; gmailId?: string;
};

export const normalizeMerchant = (m: string) =>
  m.toUpperCase().replace(/[0-9*•]+/g, ' ').replace(/[^A-ZА-ЯӨҮЁ ]/g, ' ').replace(/\s+/g, ' ').trim();

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const monthOf = (d: string) => d.slice(0, 7);
const dayOf = (d: string) => parseInt(d.slice(8, 10), 10);
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

/** Accounts = one per bank seen. Balance comes from the newest alert that carried one (users can edit it). */
export function detectAccounts(found: Found[]): DraftAccount[] {
  const by = new Map<string, Found[]>();
  for (const f of found) { const k = f.bank ?? 'Bank account'; by.set(k, [...(by.get(k) ?? []), f]); }
  return [...by.entries()].map(([bank, rows]) => {
    const withBal = rows.filter((r) => r.balance !== null && r.date).sort((a, b) => (a.date! < b.date! ? 1 : -1));
    return { id: `bank-${normalizeMerchant(bank).toLowerCase().replace(/ /g, '-') || 'x'}`, name: bank, kind: 'Checking' as const, balance: withBal[0]?.balance ?? 0, note: rows.every((r) => r.source === 'statement') ? 'From your statement' : 'From your emails' };
  });
}

const SUBS = /netflix|spotify|youtube|apple|icloud|google|hbo|disney|gym|fitness|фитнес|prime|chatgpt|openai|adobe/i;
const LOAN = /loan|зээл|credit line|mortgage/i;

/** Regular payments: same merchant, roughly the same amount, in several different months. */
export function detectRegular(found: Found[]): Regular[] {
  const groups = new Map<string, Found[]>();
  for (const f of found) {
    if (f.type !== 'spend' || !f.date) continue;
    const k = normalizeMerchant(f.merchant);
    if (k.length < 2) continue;
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  const out: Regular[] = [];
  for (const [key, rows] of groups) {
    const months = new Set(rows.map((r) => monthOf(r.date!)));
    const med = median(rows.map((r) => r.amount));
    const steady = rows.every((r) => Math.abs(r.amount - med) <= med * 0.15);
    const sorted = [...rows].sort((a, b) => (a.date! < b.date! ? -1 : 1));
    let monthlyGap = false;
    if (months.size === 2 && steady && rows.length === 2) {
      const gap = (Date.parse(sorted[1].date!) - Date.parse(sorted[0].date!)) / 864e5;
      monthlyGap = gap >= 26 && gap <= 35;
    }
    if (!steady || !(months.size >= 3 || monthlyGap)) continue;
    const name = rows[0].merchant.trim();
    const kind: Regular['kind'] = LOAN.test(name) ? 'Loan' : SUBS.test(name) ? 'Subscription' : 'Bill';
    out.push({ id: key.toLowerCase().replace(/ /g, '-'), name, kind, monthly: roundNearest100(med), note: `Every ${ordinal(Math.round(median(rows.map((r) => dayOf(r.date!)))))}`, on: true });
  }
  return out.sort((a, b) => b.monthly - a.monthly);
}

const CATEGORIES: { name: string; words: string[] }[] = [
  { name: 'Groceries', words: ['supermarket', 'market', 'emart', 'nomin', 'minii delguur', 'grocery', 'shop', 'delguur', 'дэлгүүр'] },
  { name: 'Coffee', words: ['coffee', 'cafe', 'café', 'tom n toms', 'steppe', 'starbucks', 'tea', 'кофе'] },
  { name: 'Transport', words: ['taxi', 'uber', 'bus', 'fuel', 'petrol', 'shell', 'parking', 'такси', 'шатахуун'] },
  { name: 'Dining Out', words: ['pizza', 'restaurant', 'hotpot', 'grill', 'bbq', 'bar', 'kfc', 'burger', 'ресторан'] },
  { name: 'Shopping', words: ['mall', 'zara', 'h&m', 'uniqlo', 'store', 'fashion', 'cloth'] },
];
export function categoryOf(merchant: string): string {
  const m = merchant.toLowerCase();
  return CATEGORIES.find((c) => c.words.some((w) => m.includes(w)))?.name ?? 'Everything else';
}

/** What you usually spend: 3-month average per category, leaving out the regular payments found above. */
export function detectUsual(found: Found[], regular: Regular[], months = 3): Usual[] {
  const regularKeys = new Set(regular.map((r) => r.id));
  const totals = new Map<string, { sum: number; n: number }>();
  for (const f of found) {
    if (f.type !== 'spend') continue;
    if (regularKeys.has(normalizeMerchant(f.merchant).toLowerCase().replace(/ /g, '-'))) continue;
    const c = categoryOf(f.merchant);
    const t = totals.get(c) ?? { sum: 0, n: 0 };
    totals.set(c, { sum: t.sum + f.amount, n: t.n + 1 });
  }
  return [...totals.entries()]
    .map(([name, t]) => ({ id: name.toLowerCase().replace(/ /g, '-'), name, monthly: roundNearest100(t.sum / months), payments: Math.max(1, Math.round(t.n / months)), on: true }))
    .filter((u) => u.monthly > 0)
    .sort((a, b) => b.monthly - a.monthly);
}

/** Everything the scan found, shaped as the onboarding draft. */
export function draftFromScan(found: Found[]): Draft {
  const regular = detectRegular(found);
  return { ...emptyDraft(), accounts: detectAccounts(found), regular, usual: detectUsual(found, regular) };
}

/** Turn what was found into transactions, filed into the envelopes made from the same scan (the rest stay unsorted for Review). */
export function txnsFromScan(found: Found[], envelopes: Envelope[], accounts: Account[]): Txn[] {
  const byName = new Map(envelopes.map((e) => [e.name.toLowerCase(), e.id]));
  const byId = new Set(envelopes.map((e) => e.id));
  const bankId = (bank: string | null) => accounts.find((a) => a.name === (bank ?? 'Bank account'))?.id ?? accounts[0]?.id ?? 'cash';
  return found.flatMap((f, i): Txn[] => {
    if (!f.date || f.amount <= 0) return [];
    let envelopeId: string | null = null;
    if (f.type === 'spend') {
      const reg = `reg-${normalizeMerchant(f.merchant).toLowerCase().replace(/ /g, '-')}`;
      envelopeId = byId.has(reg) ? reg : byName.get(categoryOf(f.merchant).toLowerCase()) ?? null;
    }
    return [{ id: f.gmailId ? `g-${f.gmailId}` : `s-${i}-${f.date}-${f.amount}`, envelopeId, merchant: f.merchant, amount: f.amount, type: f.type, date: f.date, accountId: bankId(f.bank), source: f.source ?? 'gmail' }];
  });
}
