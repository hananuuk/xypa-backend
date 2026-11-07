import { describe, expect, it } from 'vitest';
import { topUnsortedMerchants } from './topMerchants';
import type { Txn } from './types';

const t = (id: string, merchant: string, amount: number, over: Partial<Txn> = {}): Txn =>
  ({ id, envelopeId: null, merchant, amount, type: 'spend', date: '2026-11-01', accountId: 'a', source: 'statement', ...over });

describe('topUnsortedMerchants', () => {
  it('groups, ranks by count then total, and skips sorted rows and transfers', () => {
    const r = topUnsortedMerchants([t('1', 'Cafe', 100), t('2', 'Cafe', 100), t('3', 'Shop', 900), t('4', 'Nomin', 50), t('5', 'Nomin', 60, { envelopeId: 'e' }), t('6', 'To ··1', 5, { kind: 'person' })]);
    expect(r.map((g) => [g.merchant, g.count, g.total])).toEqual([['Cafe', 2, 200], ['Shop', 1, 900], ['Nomin', 1, 50]]);
  });
  it('respects the limit', () => {
    expect(topUnsortedMerchants(['a', 'b', 'c'].map((m, i) => t(String(i), m, 1)), 2)).toHaveLength(2);
  });
});
