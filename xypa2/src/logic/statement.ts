import type { Found } from './scan';

// Generic statement reader. It looks for a header row and the usual columns (English and Mongolian),
// and falls back to the running balance to tell money in from money out. Tuned on real bank files later.

const norm = (v: unknown) => String(v ?? '').trim();
const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = norm(v).replace(/[\s ₮]|MNT/gi, '');
  if (!/^[-−(]?\d[\d,]*(\.\d+)?\)?$/.test(t)) return null;
  const neg = /^[-−(]/.test(t);
  const n = parseFloat(t.replace(/[^\d.]/g, ''));
  return neg ? -n : n;
};

export function toIsoDate(v: unknown): string | null {
  if (typeof v === 'number' && v > 30000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10); // Excel serial
  const t = norm(v);
  let m = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

const COLS = {
  date: /огноо|date|цаг/i,
  desc: /утга|description|details|narrative|гүйлгээний тайлбар|merchant/i,
  debit: /зарлага|дебит|debit|withdraw|out\b/i,
  credit: /орлого|кредит|credit|deposit|in\b/i,
  amount: /дүн|amount/i,
  balance: /үлдэгдэл|balance/i,
};

/** Rows from a spreadsheet or CSV. */
export function parseRows(rows: unknown[][], bank: string): Found[] {
  const hi = rows.findIndex((r) => r.some((c) => COLS.date.test(norm(c))) && r.some((c) => COLS.balance.test(norm(c)) || COLS.amount.test(norm(c)) || COLS.debit.test(norm(c)) || COLS.credit.test(norm(c))));
  if (hi < 0) return [];
  const head = rows[hi].map(norm);
  const find = (re: RegExp, skip: number[] = []) => head.findIndex((h, i) => !skip.includes(i) && re.test(h));
  const cDate = find(COLS.date);
  const cBal = find(COLS.balance);
  const cDeb = find(COLS.debit);
  const cCre = find(COLS.credit, [cDeb]);
  const cDesc = find(COLS.desc);
  const cAmt = cDeb < 0 && cCre < 0 ? find(COLS.amount, [cBal]) : -1;
  const out: Found[] = [];
  let prevBal: number | null = null;
  for (const r of rows.slice(hi + 1)) {
    const date = toIsoDate(r[cDate]);
    if (!date) continue;
    const bal = cBal >= 0 ? num(r[cBal]) : null;
    let amount = 0; let type: 'spend' | 'income' = 'spend';
    if (cDeb >= 0 || cCre >= 0) {
      const d = Math.abs(num(r[cDeb]) ?? 0); const c = Math.abs(num(r[cCre]) ?? 0);
      if (d > 0) { amount = d; type = 'spend'; } else if (c > 0) { amount = c; type = 'income'; }
    } else if (cAmt >= 0) {
      const a = num(r[cAmt]) ?? 0;
      amount = Math.abs(a);
      type = a < 0 ? 'spend' : a > 0 ? 'income' : 'spend';
      if (bal !== null && prevBal !== null && a >= 0) type = bal < prevBal ? 'spend' : 'income';
    }
    if (bal !== null) prevBal = bal;
    if (amount <= 0) continue;
    const merchant = norm(r[cDesc]).replace(/^\d[\d*•\s]{6,}\d\s*:\s*/, '').slice(0, 60) || 'Statement';
    out.push({ bank, card: null, merchant, amount: Math.round(amount), type, date, balance: bal !== null ? Math.round(bal) : null, source: 'statement' });
  }
  return out;
}

/** Lines of text from a PDF statement: a date, a description, then amounts ending in the balance. */
export function parseText(text: string, bank: string): Found[] {
  const out: Found[] = [];
  let prevBal: number | null = null;
  for (const line of text.split(/\r?\n/)) {
    const date = toIsoDate(line.slice(0, 24));
    if (!date) continue;
    const afterDate = line.replace(/^\s*\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}(\s+\d{1,2}:\d{2}(:\d{2})?)?/, '');
    const nums = [...afterDate.matchAll(/-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+\.\d{2}|\b\d{4,}\b/g)];
    if (nums.length < 2) continue;
    const values = nums.map((m) => parseFloat(m[0].replace(/,/g, '')));
    const bal = values[values.length - 1];
    let amount = 0; let type: 'spend' | 'income' = 'spend';
    if (values.length >= 3) {
      // [debit, credit, balance]: whichever side has a value tells the direction
      const d = Math.abs(values[0]); const c = Math.abs(values[1]);
      if (d > 0) { amount = d; type = 'spend'; } else if (c > 0) { amount = c; type = 'income'; }
    } else {
      amount = Math.abs(values[0]);
      type = prevBal !== null ? (bal < prevBal ? 'spend' : 'income') : values[0] < 0 ? 'spend' : 'income';
    }
    prevBal = bal;
    if (amount <= 0) continue;
    const merchant = afterDate.slice(0, nums[0].index).replace(/^\d[\d*•\s]{6,}\d\s*:\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Statement';
    out.push({ bank, card: null, merchant, amount: Math.round(amount), type, date, balance: Math.round(bal), source: 'statement' });
  }
  return out;
}

/** Same payment can appear in two statements; keep one. */
export function dedupe(found: Found[]): Found[] {
  const seen = new Set<string>();
  return found.filter((f) => { const k = `${f.bank}|${f.date}|${f.amount}|${f.type}|${f.merchant}`; if (seen.has(k)) return false; seen.add(k); return true; });
}
