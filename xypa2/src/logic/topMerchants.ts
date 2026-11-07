import type { Txn } from './types';

export type MerchantGroup = { merchant: string; count: number; total: number; ids: string[] };

/** Unsorted purchases grouped by merchant, most frequent first (ties: biggest total). Transfers are not purchases. */
export function topUnsortedMerchants(txns: Txn[], limit = 10): MerchantGroup[] {
  const by = new Map<string, MerchantGroup>();
  for (const t of txns) {
    if (t.type !== 'spend' || t.kind || t.envelopeId !== null) continue;
    const g = by.get(t.merchant) ?? { merchant: t.merchant, count: 0, total: 0, ids: [] };
    g.count += 1; g.total += t.amount; g.ids.push(t.id);
    by.set(t.merchant, g);
  }
  return [...by.values()].sort((a, b) => b.count - a.count || b.total - a.total).slice(0, limit);
}
