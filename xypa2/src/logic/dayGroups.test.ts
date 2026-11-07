import { describe, expect, it } from 'vitest';
import { categoryLabel, dayLabel, groupByDay } from './dayGroups';
import type { Txn } from './types';

const t = (id: string, date: string, over: Partial<Txn> = {}): Txn => ({ id, envelopeId: null, merchant: 'x', amount: 1, type: 'spend', date, accountId: 'a', source: 'manual', ...over });

describe('day groups', () => {
  it('labels today, yesterday, then dates', () => {
    expect(dayLabel('2026-11-07', '2026-11-07')).toBe('Today');
    expect(dayLabel('2026-11-06', '2026-11-07')).toBe('Yesterday');
    expect(dayLabel('2026-11-03', '2026-11-07')).toBe('Tue, Nov 3');
    expect(dayLabel('2025-12-31', '2026-11-07')).toBe('Wed, Dec 31, 2025');
    expect(dayLabel('2026-10-31', '2026-11-01')).toBe('Yesterday');
  });
  it('groups newest first', () => {
    const g = groupByDay([t('a', '2026-11-05'), t('b', '2026-11-07'), t('c', '2026-11-05')], '2026-11-07');
    expect(g.map((x) => [x.label, x.items.length])).toEqual([['Today', 1], ['Thu, Nov 5', 2]]);
  });
  it('category label', () => {
    expect(categoryLabel(t('a', '2026-11-05'), 'Coffee')).toBe('Coffee');
    expect(categoryLabel(t('a', '2026-11-05'))).toBe('Not sorted yet');
    expect(categoryLabel(t('a', '2026-11-05', { kind: 'own' }))).toBe('Between your accounts');
  });
});
