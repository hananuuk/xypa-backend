import { describe, expect, it } from 'vitest';
import { buildPlan, emptyDraft } from './onboarding';
import { detectAccounts, detectRegular, detectUsual, draftFromScan, Found, txnsFromScan, normalizeMerchant, monthlySpend, recurringMerchants } from './scan';

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
    expect(detectAccounts([f('A', 1, '2026-11-01', { account: '111122223333' }), f('B', 1, '2026-11-02', { account: '444455556666' })]).map((x) => x.name)).toEqual(['M bank ··3333', 'M bank ··6666']);
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
    const t = txnsFromScan(rows, plan.envelopes, plan.accounts, '2026-11');
    expect(t.find((x) => x.merchant === 'NETFLIX.COM')!.envelopeId).toBe('reg-netflix-com');
    expect(t.find((x) => x.merchant === 'NOMIN SUPERMARKET')!.envelopeId).toBe('use-groceries');
    expect(t.find((x) => x.type === 'income')!.envelopeId).toBeNull();
    expect(t.every((x) => plan.accounts.some((a) => a.id === x.accountId))).toBe(true);
  });
});

describe('sureCategoryOf', () => {
  it('files only names that leave no doubt', async () => {
    const { sureCategoryOf } = await import('./scan');
    expect(sureCategoryOf('COFFEE NAMU CENTRAL')).toBe('Coffee');
    expect(sureCategoryOf('Tom N Toms 28')).toBe('Coffee');
    expect(sureCategoryOf('Улаанбаатар такси')).toBe('Transport');
    expect(sureCategoryOf('STEAK HOUSE')).toBeNull();
    expect(sureCategoryOf('BARBER SHOP')).toBeNull();
    expect(sureCategoryOf('CENTRAL TOWER')).toBeNull();
    expect(sureCategoryOf('Ruby room burger')).toBe('Dining Out');
  });
});

describe('recurring merchants and monthly spend', () => {
  const mk = (merchant: string, date: string, amount = 1000, extra: object = {}) => ({ bank: 'M bank', card: null, merchant, amount, type: 'spend' as const, date, balance: null, ...extra });
  const found = [
    mk('EMART 12', '2026-09-03'), mk('EMART 14', '2026-09-20'), mk('EMART', '2026-10-02'), mk('Shell', '2026-10-05'), mk('Shell', '2026-10-09'),
    mk('Transfer', '2026-10-10', 9000, { transfer: 'own' }),
  ];
  it('lists merchants paid more than twice, ignoring digits and transfers', () => {
    const r = recurringMerchants(found);
    expect(r.map((x) => x.key)).toEqual(['EMART']);
    expect(r[0].count).toBe(3);
    expect(r[0].suggested).toBe('Groceries');
  });
  it('sums spending per month without transfers', () => {
    expect(monthlySpend(found)).toEqual([{ month: '2026-09', total: 2000 }, { month: '2026-10', total: 3000 }]);
  });
  it('an override moves a merchant into the chosen category', () => {
    const u = detectUsual(found, [], 3, { SHELL: 'Fuel' });
    expect(u.find((x) => x.name === 'Fuel')?.monthly).toBeGreaterThan(0);
  });
});
