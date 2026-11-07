import { autoFile } from './budget';
import { detectAccounts, Found, linkOwnTransfers, txnsFromScan } from './scan';
import type { Account, Envelope, MerchantRule, Txn } from './types';

export type ImportResult = {
  accounts: Account[]; txns: Txn[];
  added: number; duplicates: number; unsorted: number; newAccounts: string[];
};

const sameKey = (t: Pick<Txn, 'accountId' | 'date' | 'amount' | 'type'>) => `${t.accountId}|${t.date}|${t.amount}|${t.type}`;

/** Merge a statement into what the person already has. Never changes envelopes, budgets or existing transactions. */
export function planImport(found: Found[], accounts: Account[], envelopes: Envelope[], txns: Txn[], rules: MerchantRule[], month: string): ImportResult {
  const stamp = Date.now();
  const merged = [...accounts];
  const newAccounts: string[] = [];
  for (const d of detectAccounts(found)) {
    const hit = merged.find((a) => a.name.toLowerCase() === d.name.toLowerCase());
    if (hit) continue;
    merged.push({ id: d.id, name: d.name, kind: d.kind, balance: d.balance, syncOk: true });
    newAccounts.push(d.name);
  }
  // Existing accounts keep their balance; only brand-new accounts take the statement's closing balance.
  const fresh = txnsFromScan(found, envelopes, merged, month).map((t, i) => ({ ...t, id: `imp-${stamp}-${i}` }));
  const have = new Map<string, number>();
  for (const t of txns) have.set(sameKey(t), (have.get(sameKey(t)) ?? 0) + 1);
  const add: Txn[] = [];
  let duplicates = 0;
  for (const t of fresh) {
    const k = sameKey(t);
    const n = have.get(k) ?? 0;
    if (n > 0) { have.set(k, n - 1); duplicates += 1; } else add.push(t);
  }
  const filed = autoFile(add, rules);
  const linked = linkOwnTransfers([...txns, ...filed]);
  const ownIds = new Set(linked.filter((t) => t.kind === 'own').map((t) => t.id));
  return {
    accounts: merged, txns: linked,
    added: filed.length, duplicates, unsorted: filed.filter((t) => t.envelopeId === null && !ownIds.has(t.id)).length, newAccounts,
  };
}
