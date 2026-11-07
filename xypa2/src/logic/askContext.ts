import { formatMoney } from './money';
import type { Account, Envelope, Goal, Txn } from './types';

export type AskInput = {
  today: string; month: string; currency: string;
  accounts: Account[]; envelopes: Envelope[]; goals: Goal[]; txns: Txn[];
  /** Per-envelope spent/left for this month. */
  views: { id: string; name: string; budget: number; spent: number; left: number }[];
  readyToAssign: number; safeToSpend: number;
};

const monthOf = (d: string) => d.slice(0, 7);

/** Plain-text snapshot of the user's own numbers. Sent with each question so answers are grounded in real data. */
export function buildAskContext(i: AskInput): string {
  const spend = i.txns.filter((t) => t.type === 'spend' && t.kind !== 'own');
  const months = [...new Set(spend.map((t) => monthOf(t.date)))].sort().slice(-4);
  const lines: string[] = [`Today: ${i.today}. Current month: ${i.month}. Currency: ${i.currency}.`];
  lines.push(`Ready to assign: ${formatMoney(i.readyToAssign)}. Safe to spend today: ${formatMoney(i.safeToSpend)}.`);
  lines.push('Accounts:', ...i.accounts.map((a) => `- ${a.name} (${a.kind}): ${formatMoney(a.balance)}`));
  lines.push('Envelopes this month (budget / spent / left):', ...i.views.map((v) => `- ${v.name}: ${formatMoney(v.budget)} / ${formatMoney(v.spent)} / ${formatMoney(v.left)}`));
  if (i.goals.length) lines.push('Goals:', ...i.goals.map((g) => `- ${g.name}`));
  lines.push('Spending by month:', ...months.map((m) => `- ${m}: ${formatMoney(spend.filter((t) => monthOf(t.date) === m).reduce((a, t) => a + t.amount, 0))}`));
  const by: Record<string, { total: number; n: number }> = {};
  for (const t of spend) if (months.includes(monthOf(t.date))) { const e = (by[t.merchant] ??= { total: 0, n: 0 }); e.total += t.amount; e.n += 1; }
  lines.push('Top merchants (recent months):', ...Object.entries(by).sort((a, b) => b[1].total - a[1].total).slice(0, 10).map(([m, v]) => `- ${m}: ${formatMoney(v.total)} over ${v.n}`));
  const name = (id: string | null) => i.envelopes.find((e) => e.id === id)?.name ?? 'unsorted';
  lines.push('Latest transactions:', ...[...i.txns].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 40).map((t) => `- ${t.date} ${t.type === 'spend' ? '-' : '+'}${formatMoney(t.amount)} ${t.merchant} [${name(t.envelopeId)}]`));
  return lines.join('\n').slice(0, 12000);
}
