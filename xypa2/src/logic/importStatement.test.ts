import { describe, expect, it } from 'vitest';
import { planImport } from './importStatement';
import type { Found } from './scan';
import type { Account, Envelope, Txn } from './types';

const f = (date: string, amount: number, merchant: string, over: Partial<Found> = {}): Found =>
  ({ bank: 'M bank', card: null, merchant, amount, type: 'spend', date, balance: null, source: 'statement', ...over } as Found);
const acc: Account = { id: 'a1', name: 'M bank', kind: 'Checking', balance: 1000, syncOk: true };
const env: Envelope[] = [];

describe('planImport', () => {
  it('adds new transactions and a new account', () => {
    const r = planImport([f('2026-11-02', 500, 'Nomin'), f('2026-11-03', 700, 'Cafe', { bank: 'Golomt' })], [acc], env, [], [], '2026-11');
    expect(r.added).toBe(2);
    expect(r.newAccounts).toEqual(['Golomt']);
    expect(r.accounts.find((a) => a.name === 'M bank')!.balance).toBe(1000);
  });
  it('skips what is already there, one for one', () => {
    const have: Txn[] = [{ id: 't', envelopeId: null, merchant: 'Nomin', amount: 500, type: 'spend', date: '2026-11-02', accountId: 'a1', source: 'gmail' }];
    const r = planImport([f('2026-11-02', 500, 'Nomin'), f('2026-11-02', 500, 'Nomin')], [acc], env, have, [], '2026-11');
    expect(r.duplicates).toBe(1);
    expect(r.added).toBe(1);
    expect(r.txns).toHaveLength(2);
  });
});
