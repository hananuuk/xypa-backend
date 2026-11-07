// Turns one bank-alert email into a transaction. Pure, so it is unit-tested without Gmail.
const { findBestAmount, stripHtml, extractTxnDetail } = require('./parse');

// Official Mongolian banks only. Matched against the SENDER, never the body, so a mail that merely mentions a bank
// (or comes from a securities/insurance arm with a similar name) is not read as a bank alert.
const BANKS = [
  { name: 'M bank', re: /m[\s-]?bank|мбанк|м банк/i },
  { name: 'Khan Bank', re: /khan\s?bank|хаан\s?банк/i },
  { name: 'Golomt', re: /golomt|голомт/i },
  { name: 'TDB', re: /\btdb\b|tdbm|trade and development|худалдаа хөгжлийн/i },
  { name: 'XacBank', re: /xac\s?bank|хас\s?банк/i },
  { name: 'State Bank', re: /state\s?bank|төрийн банк/i },
  { name: 'Bogd', re: /bogd|богд/i },
  { name: 'Arig', re: /arig|ариг/i },
  { name: 'NIB', re: /nibank|national investment|үндэсний хөрөнгө/i },
  { name: 'Chinggis Khaan Bank', re: /ckbank|chinggis|чингис/i },
  { name: 'Credit Bank', re: /credit\s?bank|кредит\s?банк/i },
  { name: 'Trans Bank', re: /trans\s?bank|транс\s?банк/i },
];
const NOT_A_BANK = /securit|capital|insur|invest|broker|leasing|asset|fund|даатгал|үнэт цаас|хөрөнгө оруулалт(?!ын банк)/i;

/** The official bank this sender belongs to, or null (securities firms, shops, anything else). */
function detectBank(from) {
  const f = String(from || '');
  if (NOT_A_BANK.test(f)) return null;
  const hit = BANKS.find((b) => b.re.test(f));
  return hit ? hit.name : null;
}

function detectType(text) {
  if (/Өөрийн данс хооронд|own account/i.test(text)) return 'transfer';
  const out = /зарлага|expense|debit|purchase|payment to|худалдан авалт/i.test(text);
  const inc = /орлого|income|credit(?!\s*card)|received|хүлээн авсан|илгээв/i.test(text);
  if (out) return 'spend';
  if (inc) return 'income';
  return 'spend';
}

function pickAmount(subject, clean) {
  const labeled = clean.match(/(?:Гүйлгээний дүн|Дүн|Amount)\s*[:：]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i);
  if (labeled) return parseFloat(labeled[1].replace(/,/g, ''));
  const currencyFirst = clean.match(/MNT\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (currencyFirst) return parseFloat(currencyFirst[1].replace(/,/g, ''));
  // never let the running balance ("Үлдэгдэл") be mistaken for the amount
  const withoutBalance = clean.split('\n').filter((l) => !/Үлдэгдэл|Balance|Available/i.test(l)).join('\n');
  return findBestAmount(`${subject}\n${withoutBalance}`);
}

function detectBalance(text) {
  const m = text.match(/(?:Үлдэгдэл|Balance|Available)\s*[:：]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s?(?:MNT|₮)?/i);
  return m ? Math.round(parseFloat(m[1].replace(/,/g, ''))) : null;
}

function detectAccount(text) {
  const m = text.match(/(?:Илгээсэн данс|Хүлээн авсан данс|Данс)\s*[:：]\s*(\d{6,})/);
  return m ? m[1] : null;
}

/** @returns {null | {bank, card, merchant, amount, type, date, balance, gmailId}} */
function parseAlert({ id, from, subject, body, dateHeader }) {
  const bank = detectBank(from);
  if (!bank) return null;
  const clean = stripHtml(body || '');
  const amount = pickAmount(subject || '', clean);
  if (amount === null || amount <= 0) return null;
  const { merchant, card } = extractTxnDetail(from || '', subject || '', clean);
  const iso = dateHeader ? new Date(dateHeader) : null;
  return {
    gmailId: id,
    bank,
    card,
    merchant,
    amount: Math.round(amount),
    type: detectType(`${subject}\n${clean}`),
    date: iso && !Number.isNaN(iso.getTime()) ? iso.toISOString().slice(0, 10) : null,
    balance: detectBalance(clean),
    account: detectAccount(clean),
  };
}

module.exports = { parseAlert, detectBank, detectType, detectBalance, detectAccount };
