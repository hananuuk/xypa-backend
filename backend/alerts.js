// Turns one bank-alert email into a transaction. Pure, so it is unit-tested without Gmail.
const { findBestAmount, stripHtml, extractTxnDetail } = require('./parse');

const BANKS = [
  { name: 'M bank', re: /m[\s-]?bank|мбанк|м банк|mbank\.mn|m-bank\.mn/i },
  { name: 'Khan Bank', re: /khan\s?bank|хаан\s?банк|khanbank/i },
  { name: 'Golomt', re: /golomt|голомт/i },
  { name: 'TDB', re: /\btdb\b|trade and development|худалдаа хөгжлийн|tdbm/i },
  { name: 'XacBank', re: /xac\s?bank|хас\s?банк|xacbank/i },
  { name: 'State Bank', re: /state\s?bank|төрийн банк|statebank/i },
  { name: 'Capitron', re: /capitron|капитрон/i },
  { name: 'Bogd', re: /bogd|богд/i },
];

function detectBank(from, subject, body) {
  const hay = `${from}\n${subject}\n${body.slice(0, 600)}`;
  for (const b of BANKS) if (b.re.test(hay)) return b.name;
  const display = from.replace(/<.*>/, '').replace(/"/g, '').trim();
  return display || null;
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
  const clean = stripHtml(body || '');
  const amount = pickAmount(subject || '', clean);
  if (amount === null || amount <= 0) return null;
  const { merchant, card } = extractTxnDetail(from || '', subject || '', clean);
  const iso = dateHeader ? new Date(dateHeader) : null;
  return {
    gmailId: id,
    bank: detectBank(from || '', subject || '', clean),
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
