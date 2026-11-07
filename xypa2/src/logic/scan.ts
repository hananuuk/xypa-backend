import { roundNearest100 } from './money';
import type { Account, Envelope, Txn } from './types';
import type { Draft, DraftAccount, Regular, Usual } from './onboarding';
import { emptyDraft } from './onboarding';

/** One transaction read from an email or a statement. */
export type Found = {
  bank: string | null; card: string | null; merchant: string; amount: number;
  type: 'spend' | 'income'; date: string | null; balance: number | null; source?: 'gmail' | 'statement'; gmailId?: string; account?: string;
  /** Set for bank transfers: 'own' when it clearly names the owner, otherwise 'person' (may be upgraded by pairing). */
  transfer?: 'own' | 'person';
  /** Last 8 digits of the other side's account on a transfer, when the statement prints it. */
  counterparty?: string;
};

export const normalizeMerchant = (m: string) =>
  m.toUpperCase().replace(/[0-9*•]+/g, ' ').replace(/[^A-ZА-ЯӨҮЁ ]/g, ' ').replace(/\s+/g, ' ').trim();

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const monthOf = (d: string) => d.slice(0, 7);
const dayOf = (d: string) => parseInt(d.slice(8, 10), 10);
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

/** One account per bank + account number seen. Balance comes from the newest row that carried one (users can edit it). */
export function detectAccounts(found: Found[]): DraftAccount[] {
  const by = new Map<string, Found[]>();
  for (const f of found) { const k = `${f.bank ?? 'Bank account'}|${f.account ?? ''}`; by.set(k, [...(by.get(k) ?? []), f]); }
  const perBank = new Map<string, number>();
  for (const k of by.keys()) { const bank = k.split('|')[0]; perBank.set(bank, (perBank.get(bank) ?? 0) + 1); }
  return [...by.entries()].map(([key, rows]) => {
    const [bank, account] = key.split('|');
    let best: Found | null = null;
    for (const r of rows) if (r.balance !== null && r.date && (!best || r.date >= best.date!)) best = r;
    const name = perBank.get(bank)! > 1 && account ? `${bank} ··${account.slice(-4)}` : bank;
    const id = `acct-${(bank + account).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return { id, name, kind: 'Checking' as const, balance: best?.balance ?? 0, note: rows.every((r) => r.source === 'statement') ? 'From your statement' : 'From your emails' };
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
/** Only names that can't be anything else. Used to file a payment without asking; everything else is left for the person. */
const SURE: { name: string; words: string[] }[] = [
  { name: 'Coffee', words: ['coffee', 'cafe', 'café', 'кофе', 'starbucks', 'tom n toms'] },
  { name: 'Groceries', words: ['supermarket', 'grocery', 'emart', 'e-mart'] },
  { name: 'Transport', words: ['taxi', 'uber', 'такси', 'fuel', 'petrol', 'шатахуун', 'parking'] },
  { name: 'Dining Out', words: ['pizza', 'restaurant', 'ресторан', 'hotpot', 'kfc', 'burger', 'bbq'] },
];
const hasWord = (text: string, w: string) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'u').test(text);
/** The category when the merchant name leaves no doubt, otherwise null. Whole words only: "tea" would otherwise match "steak". */
export function sureCategoryOf(merchant: string): string | null {
  const m = merchant.toLowerCase();
  return SURE.find((c) => c.words.some((w) => hasWord(m, w)))?.name ?? null;
}

export function categoryOf(merchant: string): string {
  const m = merchant.toLowerCase();
  if (m === 'transfer') return 'Transfers';
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
    if (c === 'Transfers') continue;
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
export function txnsFromScan(found: Found[], envelopes: Envelope[], accounts: Account[], month?: string): Txn[] {
  const byName = new Map(envelopes.map((e) => [e.name.toLowerCase(), e.id]));
  const byId = new Set(envelopes.map((e) => e.id));
  const bankId = (bank: string | null, account?: string) =>
    accounts.find((a) => a.name === (bank ?? 'Bank account') || (account && a.name === `${bank} ··${account.slice(-4)}`))?.id ?? accounts[0]?.id ?? 'cash';
  // A transfer to an account number that is one of yours is you moving money.
  const mine = new Set([...found.map((f) => f.account), ...accounts.map((a) => a.id.match(/\d{8,}/)?.[0])].filter((n): n is string => !!n));
  const isMine = (cp?: string) => !!cp && [...mine].some((n) => n.endsWith(cp));
  const all = found.flatMap((f, i): Txn[] => {
    if (!f.date || f.amount <= 0) return [];
    const date = f.date;
    if (f.transfer === 'person' && isMine(f.counterparty)) f = { ...f, transfer: 'own', merchant: 'Between your accounts' };
    let envelopeId: string | null = null;
    if (f.type === 'spend' && !f.transfer) {
      const reg = `reg-${normalizeMerchant(f.merchant).toLowerCase().replace(/ /g, '-')}`;
      const sure = sureCategoryOf(f.merchant);
      envelopeId = byId.has(reg) ? reg : sure ? byName.get(sure.toLowerCase()) ?? null : null;
    }
    return [{ id: f.gmailId ? `g-${f.gmailId}` : `s-${i}-${date}-${f.amount}`, envelopeId, merchant: f.merchant, amount: f.amount, type: f.type, date, accountId: bankId(f.bank, f.account), source: f.source ?? 'gmail', ...(f.transfer ? { kind: f.transfer } : {}) }];
  });
  // Older months already shaped the averages; only keep them if they landed in an envelope (or are your own money moving), so Review isn't flooded.
  return linkOwnTransfers(all).filter((t) => !(month && t.date.slice(0, 7) < month && t.envelopeId === null && t.kind !== 'own'));
}

/** Money that left one of your accounts and arrived in another the same day (or next) is you moving money, not spending. */
export function linkOwnTransfers(txns: Txn[]): Txn[] {
  const out = txns.map((t) => ({ ...t }));
  const day = (d: string) => Math.round(Date.parse(d) / 86400000);
  const outs = out.filter((t) => t.kind === 'person' && t.type === 'spend');
  const ins = out.filter((t) => t.kind === 'person' && t.type === 'income');
  const used = new Set<string>();
  for (const o of outs) {
    const m = ins.find((i) => !used.has(i.id) && i.amount === o.amount && i.accountId !== o.accountId && Math.abs(day(i.date) - day(o.date)) <= 1);
    if (m) { used.add(m.id); o.kind = 'own'; m.kind = 'own'; o.merchant = 'Between your accounts'; m.merchant = 'Between your accounts'; }
  }
  return out;
}
