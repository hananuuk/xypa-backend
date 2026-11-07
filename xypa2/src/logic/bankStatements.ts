import type { Found } from './scan';

// Readers for the statement layouts we have seen (M bank, Golomt). Anything else falls back to the generic reader.

export type StatementMeta = { bank: string; account?: string; totalIn?: number; totalOut?: number };
export type Parsed = { found: Found[]; meta: StatementMeta };

const MONEY = /\d{1,3}(?:,\d{3})*\.\d{2}/g;
const toNum = (s: string) => parseFloat(s.replace(/,/g, ''));
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const CARD = /^(\d{4,6}\*{6,8}\d{4}):\s*/;

export function detectBankFromText(text: string): 'M bank' | 'Golomt' | null {
  if (/GOLOMT BANK/i.test(text) && /ACCOUNT STATEMENT/i.test(text)) return 'Golomt';
  if (/Гүйлгээний\s+дугаар/.test(text) && /М банк|m-bank\.mn/i.test(text)) return 'M bank';
  return null;
}

/** Outgoing "X-с илгээв" rows are transfers sent by the owner; they are not shopping. */
const TRANSFER = /илгээв|шилжүүлэг|хооронд/i;
export const isTransferText = (d: string) => TRANSFER.test(d);

const words = (s: string) => s.toUpperCase().split(/[^A-ZА-ЯӨҮЁ]+/).filter((w) => w.length > 2);
const title = (s: string) => s.toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());
const isOwn = (name: string, owner: string[]) => words(name).some((w) => owner.includes(w));

/** Bank transfers (not card payments): who sent it, who got it, and whether it stayed in the owner's own hands. */
export function transferInfo(desc: string, type: 'spend' | 'income', owner: string[], counterparty?: string): { merchant: string; transfer: 'own' | 'person' } | null {
  if (CARD.test(desc) || /Charges for|шимтгэл/i.test(desc)) return null;
  if (/socialpay/i.test(desc)) return owner.length && isOwn(desc, owner) ? { merchant: 'Between your accounts', transfer: 'own' } : null;
  if (!TRANSFER.test(desc)) return null;
  const sender = desc.match(/^(.+?)\s*-\s*С\s+ИЛГЭЭВ/i)?.[1];
  if (type === 'income') {
    if (sender && isOwn(sender, owner)) return { merchant: 'Between your accounts', transfer: 'own' };
    return { merchant: sender ? `From ${title(sender)}` : 'Money received', transfer: 'person' };
  }
  return { merchant: counterparty ? `To ··${counterparty.slice(-4)}` : 'Sent to someone', transfer: 'person' };
}

function labelMerchant(desc: string): { merchant: string; card: string | null } {
  const card = desc.match(CARD);
  let d = desc.replace(CARD, '').replace(/^[A-Z]{2,4}-\d+\s*:\s*/, '');
  if (/^SOCIALPAY/i.test(d)) return { merchant: 'SocialPay', card: card?.[1] ?? null };
  if (/Charges for|шимтгэл/i.test(d)) return { merchant: 'Bank fee', card: card?.[1] ?? null };
  if (TRANSFER.test(d) && !card) return { merchant: 'Transfer', card: null };
  d = d.replace(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}:(POS|BOM|ATM):/, '');
  return { merchant: clean(d).slice(0, 60) || 'Statement', card: card?.[1] ?? null };
}

/** M bank "Дансны хуулга": rows are `N date / time ref description [account] amount balance`; the column of the amount is lost in text, so direction comes from the balance. */
export function parseMbankStatement(text: string): Parsed {
  const account = text.match(/Дансны дугаар:\s*(\d{6,})/)?.[1];
  const owner = words(text.match(/Дансны эзэмшигчийн нэр:\s*(.+?)\s+Хуулгын/)?.[1] ?? '');
  const totalIn = text.match(/Нийт орлого\s*([\d,]+\.\d{2})/)?.[1];
  const totalOut = text.match(/Нийт зарлага\s*([\d,]+\.\d{2})/)?.[1];
  const body = text.split(/Нийт орлого/)[0].replace(/^-- \d+ of \d+ --$/gm, '');
  const starts = [...body.matchAll(/^(\d{1,4}) (\d{4}-\d{2}-\d{2})\s*$/gm)];
  const found: Found[] = [];
  let prev: number | null = null;
  starts.forEach((m, i) => {
    const block = body.slice(m.index! + m[0].length, i + 1 < starts.length ? starts[i + 1].index : undefined).trim();
    const h = block.match(/^(\d{2}:\d{2}:\d{2})\s+(\S+)\s*([\s\S]*)$/);
    if (!h) return;
    let rest = h[3];
    const money = [...rest.matchAll(MONEY)];
    if (money.length < 2) return;
    const bal = toNum(money[money.length - 1][0]);
    const amount = toNum(money[money.length - 2][0]);
    rest = rest.slice(0, money[money.length - 2].index);
    const cp = rest.match(/MN\d{10}\s*(\d{8})/)?.[1];
    rest = rest.replace(/MN\d{10}\s*\d{8}/g, ' ');
    const desc = clean(rest);
    const { merchant, card } = labelMerchant(desc);
    let type: 'spend' | 'income';
    if (prev !== null) type = bal < prev ? 'spend' : 'income';
    else type = /илгээв|ЦАЛИН|цалин|орлого/i.test(desc) && !card ? 'income' : 'spend';
    prev = bal;
    const tr = transferInfo(desc, type, owner, cp);
    found.push({ bank: 'M bank', card, merchant: tr?.merchant ?? merchant, amount: Math.round(amount), type, date: m[2], balance: Math.round(bal), source: 'statement', account, ...(tr ? { transfer: tr.transfer, ...(cp ? { counterparty: cp } : {}) } : {}) });
  });
  // The first row has no row before it: if the printed totals disagree, flip it.
  if (found.length && totalIn) {
    const inSum = found.filter((f) => f.type === 'income').reduce((a, f) => a + f.amount, 0);
    if (Math.abs(inSum - toNum(totalIn)) > 1 && Math.abs(Math.abs(inSum - toNum(totalIn)) - found[0].amount) < 1) found[0] = { ...found[0], type: found[0].type === 'income' ? 'spend' : 'income' };
  }
  return { found, meta: { bank: 'M bank', account, totalIn: totalIn ? toNum(totalIn) : undefined, totalOut: totalOut ? toNum(totalOut) : undefined } };
}

/** Golomt "ACCOUNT STATEMENT": a date line, then `amount Credit|Debit description`, then daily totals. */
export function parseGolomtStatement(text: string): Parsed {
  const account = text.match(/(\d{8,})\s*\[MNT\]/)?.[1];
  const owner = words(text.match(/ИЛГЭЭВ-([А-ЯӨҮЁ ]+)\(/i)?.[1] ?? '');
  const found: Found[] = [];
  let date: string | null = null;
  let last: Found | null = null;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const d = line.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (d) { date = d[1]; last = null; continue; }
    const bal = line.match(/^([\d,]+\.\d{2})\s+END OF DAY BALANCE/);
    if (bal) { if (last) last.balance = Math.round(toNum(bal[1])); continue; }
    const e = line.match(/^([\d,]+\.\d{2})\s+(Credit|Debit)\s+(.*)$/);
    if (!e || !date) continue;
    let desc = e[3];
    // wrapped tails belong to this row until the next entry, date or daily total
    while (i + 1 < lines.length && !/^([\d,]+\.\d{2}\s+(Credit|Debit)|\d{4}-\d{2}-\d{2}$|[\d,]+\.\d{2}$|\s*$)/.test(lines[i + 1].trim())) { i += 1; desc += ` ${lines[i].trim()}`; }
    desc = clean(desc.replace(/\(Rate:\s*1\.0\)?|^1\.0\)/g, ''));
    const { merchant, card } = labelMerchant(desc);
    const gtype = e[2] === 'Credit' ? 'income' : 'spend';
    const tr = transferInfo(desc, gtype, owner);
    last = { bank: 'Golomt', card, merchant: tr?.merchant ?? merchant, amount: Math.round(toNum(e[1])), type: gtype, date, balance: null, source: 'statement', account, ...(tr ? { transfer: tr.transfer } : {}) };
    found.push(last);
  }
  return { found, meta: { bank: 'Golomt', account } };
}

export function parseKnownStatement(text: string): Parsed | null {
  const bank = detectBankFromText(text);
  if (bank === 'M bank') return parseMbankStatement(text);
  if (bank === 'Golomt') return parseGolomtStatement(text);
  return null;
}
