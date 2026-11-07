import { describe, expect, it } from 'vitest';
import { buildPlan, emptyDraft } from './onboarding';
import { detectAccounts, detectRegular, detectUsual, draftFromScan, Found, txnsFromScan, normalizeMerchant } from './scan';

const f = (merchant: string, amount: number, date: string, extra: Partial<Found> = {}): Found => ({ bank: 'M bank', card: null, merchant, amount, type: 'spend', date, balance: null, ...extra });

const rows: Found[] = [
  f('NETFLIX.COM', 12900, '2026-09-02'), f('NETFLIX.COM', 12900, '2026-10-02'), f('NETFLIX.COM', 12900, '2026-11-02'),
  f('Khan Bank loan', 450000, '2026-09-05'), f('Khan Bank loan', 450000, '2026-10-05'), f('Khan Bank loan', 450000, '2026-11-05'),
  f('NOMIN SUPERMARKET', 48600, '2026-11-05', { balance: 2301400 }), f('NOMIN SUPERMARKET', 30000, '2026-10-12'), f('NOMIN SUPERMARKET', 21400, '2026-09-20'),
  f('Tom N Toms', 9000, '2026-11-03'),
  f('Salary', 3200000, '2026-11-01', { type: 'income' }),
  f('ACME LTD', 100000, '2026-10-10'),
];

describe('scan', () => {
  it('normalises merchants', () => expect(normalizeMerchant('4207****1728:Nomin  #12')).toBe('NOMIN'));
  it('finds one account per bank with the newest balance', () => {
    const a = detectAccounts(rows);
    expect(a).toHaveLength(1);
    expect(a[0].balance).toBe(2301400);
  });
  it('finds regular payments and kinds, not irregular shopping', () => {
    const r = detectRegular(rows);
    expect(r.map((x) => x.name)).toEqual(['Khan Bank loan', 'NETFLIX.COM']);
    expect(r[0].kind).toBe('Loan');
    expect(r[1].kind).toBe('Subscription');
    expect(r[1].note).toBe('Every 2nd');
  });
  it('averages usual spending over 3 months without regulars', () => {
    const u = detectUsual(rows, detectRegular(rows));
    expect(u.find((x) => x.name === 'Groceries')!.monthly).toBe(33300);
    expect(u.find((x) => x.name === 'Coffee')!.monthly).toBe(3000);
    expect(u.some((x) => x.name === 'Everything else')).toBe(true);
  });
  it('builds a draft', () => {
    const d = draftFromScan(rows);
    expect(d.regular).toHaveLength(2);
    expect(d.accounts[0].name).toBe('M bank');
  });
  it('files scanned transactions into matching envelopes and leaves the rest unsorted', () => {
    const d = draftFromScan(rows);
    const assigned = Object.fromEntries([...d.regular.map((r) => [`reg-${r.id}`, r.monthly]), ...d.usual.map((u) => [`use-${u.id}`, u.monthly])]);
    const plan = buildPlan(d, assigned);
    const t = txnsFromScan(rows, plan.envelopes, plan.accounts);
    expect(t.find((x) => x.merchant === 'NETFLIX.COM')!.envelopeId).toBe('reg-netflix-com');
    expect(t.find((x) => x.merchant === 'NOMIN SUPERMARKET')!.envelopeId).toBe('use-groceries');
    expect(t.find((x) => x.type === 'income')!.envelopeId).toBeNull();
    expect(t.every((x) => plan.accounts.some((a) => a.id === x.accountId))).toBe(true);
  });
});
