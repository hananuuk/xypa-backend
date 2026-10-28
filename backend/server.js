const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Persistent token storage.
//
// Render (and now Vercel) both run this process on disks that do NOT survive
// a restart/redeploy/cold start — a tokens.json written with fs.writeFileSync
// quietly vanishes, which is why Gmail kept "disconnecting". The only thing
// that actually needs to survive between invocations is the OAuth *refresh*
// token: googleapis mints fresh access tokens from it automatically, in
// memory, on every call — so one small Postgres table is enough.
// ---------------------------------------------------------------------------
// Whatever prefix Vercel's "Connect to Project" UI ends up giving this
// store's env vars (none, "STORAGE_", etc.) — take the first one present.
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL
  || process.env.STORAGE_DATABASE_URL || process.env.STORAGE_POSTGRES_URL
  || process.env.DATABASE_URL_UNPOOLED || process.env.STORAGE_DATABASE_URL_UNPOOLED;

const pool = DB_URL ? new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } }) : null;

let schemaReady = null;
function ensureSchema() {
  if (!pool) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS xypa_oauth_tokens (
        id INTEGER PRIMARY KEY DEFAULT 1,
        refresh_token TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }
  return schemaReady;
}

async function loadRefreshToken() {
  if (!pool) return null;
  await ensureSchema();
  const { rows } = await pool.query('SELECT refresh_token FROM xypa_oauth_tokens WHERE id = 1');
  return rows[0] ? rows[0].refresh_token : null;
}

async function saveRefreshToken(refreshToken) {
  if (!pool || !refreshToken) return;
  await ensureSchema();
  await pool.query(
    `INSERT INTO xypa_oauth_tokens (id, refresh_token, updated_at) VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET refresh_token = EXCLUDED.refresh_token, updated_at = now()`,
    [refreshToken]
  );
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Whenever googleapis mints a new token pair it may include a fresh
// refresh_token (rare, but happens e.g. on re-consent) — persist it when it does.
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) saveRefreshToken(tokens.refresh_token).catch((e) => console.error('saveRefreshToken failed', e));
});

// Make sure this request's oauth2Client actually has the stored refresh
// token loaded before we use it — cheap (one indexed lookup) and correct
// even across cold starts / concurrent serverless invocations.
async function withAuth(res, fn) {
  try {
    const refreshToken = await loadRefreshToken();
    if (!refreshToken) return res.status(401).json({ error: 'Gmail not connected yet.' });
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return await fn();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: 'Something went wrong.' });
  }
}

// Step 1 of login: send the user to Google's consent screen
app.get('/auth/login', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  });
  res.redirect(url);
});

// Step 2: Google sends the user back here with a code we exchange for tokens
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code.');
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    if (tokens.refresh_token) await saveRefreshToken(tokens.refresh_token);

    // Tell the app we're done, instantly, from whatever opened this tab —
    // works when the OAuth flow happened in a popup/new-tab inside the same
    // browser context. (On an iOS home-screen PWA this link usually opens a
    // separate Safari process with no window.opener, so the app ALSO
    // re-checks Gmail status on its own the moment it becomes visible again —
    // see the `visibilitychange` listener in app.jsx. This is just the fast
    // path for everyone else.)
    res.send(`<!DOCTYPE html><html><body style="font-family:system-ui;background:#0b0b0c;color:#f4f4f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px;box-sizing:border-box;">
      <div>
        <p>Gmail connected. You can close this tab and go back to xypa.</p>
        <script>
          try { if (window.opener) { window.opener.postMessage({ type: 'xypa-gmail-connected' }, '*'); } } catch (e) {}
          setTimeout(function(){ try { window.close(); } catch(e) {} }, 600);
        </script>
      </div>
    </body></html>`);
  } catch (e) {
    console.error(e);
    res.status(500).send('Something went wrong connecting your Gmail. Try again.');
  }
});

app.get('/auth/status', async (req, res) => {
  res.json({ connected: !!(await loadRefreshToken()) });
});

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

// Pulls recent receipt-looking emails and parses them into transactions
app.get('/api/sync', (req, res) => withAuth(res, async () => {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const list = await gmail.users.messages.list({
    userId: 'me',
    q: '(receipt OR "order confirmation" OR "your order" OR invoice OR "payment confirmation" OR "purchase" OR "your receipt" OR "payment received" OR "thank you for your order" OR "order summary" OR "Гүйлгээний мэдэгдэл" OR "зарлага" OR "Гүйлгээний дүн") newer_than:60d',
    maxResults: 40,
  });
  const messages = list.data.messages || [];
  const results = [];
  let skippedNoAmount = 0;

  for (const m of messages) {
    const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
    const headers = msg.data.payload.headers;
    const fromHeader = headers.find((h) => h.name === 'From')?.value || '';
    const subject = headers.find((h) => h.name === 'Subject')?.value || '';
    const dateHeader = headers.find((h) => h.name === 'Date')?.value;
    const bodyText = decodeBody(msg.data.payload) || msg.data.snippet || '';
    const cleanBody = stripHtml(bodyText);
    const amount = findBestAmount(subject + '\n' + cleanBody);
    if (amount === null) { skippedNoAmount++; continue; }

    const { merchant, card, detail } = extractTxnDetail(fromHeader, subject, cleanBody);

    results.push({
      gmailId: m.id,
      merchant,
      card,
      detail,
      subject,
      amount,
      date: dateHeader ? new Date(dateHeader).toISOString().slice(0, 10) : null,
    });
  }
  res.json({ transactions: results, debug: { messagesFound: messages.length, skippedNoAmount } });
}));

app.get('/', (req, res) => res.send('xypa backend is running.'));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`xypa backend listening on port ${PORT}`));
}
module.exports = app;
