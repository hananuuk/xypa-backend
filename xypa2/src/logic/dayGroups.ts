import type { Txn } from './types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const utc = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/** "Today", "Yesterday", then "Mon, Nov 3" (with the year once it is not this year). */
export function dayLabel(iso: string, todayIso: string): string {
  const diff = Math.round((utc(todayIso) - utc(iso)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const d = new Date(utc(iso));
  const base = `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return iso.slice(0, 4) === todayIso.slice(0, 4) ? base : `${base}, ${iso.slice(0, 4)}`;
}

export const longDate = (iso: string) => {
  const d = new Date(utc(iso));
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${iso.slice(0, 4)}`;
};

export type DayGroup = { date: string; label: string; items: Txn[] };

/** Newest day first, with each day's transactions kept in the order given. */
export function groupByDay(txns: Txn[], todayIso: string): DayGroup[] {
  const by = new Map<string, Txn[]>();
  for (const t of [...txns].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) by.set(t.date, [...(by.get(t.date) ?? []), t]);
  return [...by.entries()].map(([date, items]) => ({ date, label: dayLabel(date, todayIso), items }));
}

/** What to show as the category: the envelope, or what kind of money movement it is. */
export function categoryLabel(t: Txn, envelopeName?: string): string {
  if (t.kind === 'own') return 'Between your accounts';
  if (t.type === 'income') return t.kind === 'person' ? 'From a person' : 'Money in';
  return envelopeName ?? 'Not sorted yet';
}
