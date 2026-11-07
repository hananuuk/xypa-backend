// Pure helpers for reading bank/receipt emails (moved verbatim from server.js so they can be tested).

// Same amount-guessing logic as xypa's paste-in parser
function findBestAmount(text) {
  // Mongolian bank alert format: "25,800.00MNT" or "25,800 MNT"
  const mntRe = /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s?MNT/gi;
  const mntMatches = [...text.matchAll(mntRe)];
  if (mntMatches.length) {
    return parseFloat(mntMatches[mntMatches.length - 1][1].replace(/,/g, ''));
  }

  const priorityWords = ['total', 'amount charged', 'you paid', 'order total', 'charged', 'amount due', 'grand total', 'дүн'];
  const lines = text.split(/\n/);
  const dollarRe = /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  for (const word of priorityWords) {
    for (const line of lines) {
      if (line.toLowerCase().includes(word)) {
        const m = [...line.matchAll(dollarRe)];
        if (m.length) return parseFloat(m[m.length - 1][1].replace(/,/g, ''));
      }
    }
  }
  const all = [...text.matchAll(dollarRe)].map((m) => parseFloat(m[1].replace(/,/g, '')));
  if (all.length) return Math.max(...all);
  return null;
}

function base64UrlDecode(data) {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function stripHtml(text) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|td|th|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{2,}/g, '\n');
}

// Mongolian bank alerts carry the real transaction description after a
// "Гүйлгээний утга" ("transaction description") label. Its value comes in
// two shapes:
//   "Гүйлгээний утга: 4207********1728:NOMIN SUPERMARKET"   (masked-card prefix)
//   "Гүйлгээний утга: Ануухан-с илгээв"                      (peer-to-peer, no card)
// The first shape tells us which card was used (the masked number before the
// colon) as well as the merchant. The second shape is a peer-to-peer
// transfer — there's no separate account-number field in these alerts, just
// this one phrase, which is also the closest thing to a "who" we get, so we
// keep it verbatim as `detail` for display (it already reads naturally,
// e.g. "Ануухан-с илгээв" = "sent by Anuukhan").
function cleanupText(s) {
  return s.replace(/\s+/g, ' ').replace(/[.,]+$/, '').trim();
}

function extractTxnDetail(fromHeader, subject, cleanBody) {
  const labelMatch = cleanBody.match(/Гүйлгээний утга\s*[:：]\s*([^\n\r]+)/);
  if (labelMatch) {
    const raw = labelMatch[1].trim();
    const idx = Math.max(raw.lastIndexOf(':'), raw.lastIndexOf('：'));
    if (idx !== -1) {
      const cardPart = raw.slice(0, idx).trim();
      const merchantPart = cleanupText(raw.slice(idx + 1));
      // only treat the prefix as a card if it actually looks like a masked
      // card number (digits/asterisks/dots), not just any text that
      // happened to contain a colon
      if (/^[\d*•\s]{6,}$/.test(cardPart) && merchantPart) {
        return { merchant: merchantPart.slice(0, 60), card: cardPart.replace(/\s+/g, ''), detail: merchantPart };
      }
    }
    const value = cleanupText(raw);
    if (value) return { merchant: value.slice(0, 60), card: null, detail: value };
  }

  // fall back to the generic masked-card pattern for formats without the label
  const m = cleanBody.match(/(\d[\d*•\s]{6,}\d)\s*:\s*([A-Za-zА-Яа-яЁёӨөҮү][A-Za-zА-Яа-яЁёӨөҮү0-9 .,&'\-]{1,39})/);
  if (m) {
    const merchant = cleanupText(m[2]);
    return { merchant, card: m[1].replace(/\s+/g, ''), detail: merchant };
  }

  const fallback = fromHeader.replace(/<.*>/, '').replace(/"/g, '').trim() || subject.slice(0, 40);
  return { merchant: fallback, card: null, detail: null };
}

function decodeBody(payload) {
  let plain = '';
  let html = '';
  function walk(part) {
    if (part.body && part.body.data) {
      const decoded = base64UrlDecode(part.body.data);
      if (part.mimeType === 'text/html') html += decoded;
      else plain += decoded;
    }
    if (part.parts) part.parts.forEach(walk);
  }
  walk(payload);
  if (plain.trim()) return plain;
  return html;
}

module.exports = { findBestAmount, base64UrlDecode, stripHtml, cleanupText, extractTxnDetail, decodeBody };
