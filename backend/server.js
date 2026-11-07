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
  // xypa 2.0 sign-in flows carry a `state`; the original v1 flow does not.
  if (req.query.state && v2.callback) return v2.callback(req, res);
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

const { findBestAmount, stripHtml, extractTxnDetail, decodeBody } = require('./parse');
const v2 = require('./v2');

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

v2.mount(app, { pool });

app.get('/', (req, res) => res.send('xypa backend is running.'));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`xypa backend listening on port ${PORT}`));
}
module.exports = app;
