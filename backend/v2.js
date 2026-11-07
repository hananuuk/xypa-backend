// xypa 2.0 API: per-person Google sign-in, session tokens and Gmail scanning.
// Additive to the original v1 routes in server.js, which stay as they were.
const crypto = require('crypto');
const { google } = require('googleapis');
const { base64UrlDecode, decodeBody } = require('./parse');
const { parseAlert } = require('./alerts');

const SESSION_DAYS = 90;
const APP_REDIRECT = /^(exp|exps|xypa):\/\//;
const SCAN_QUERY = '(receipt OR "order confirmation" OR "payment confirmation" OR "payment received" OR "Гүйлгээний мэдэгдэл" OR "зарлага" OR "орлого" OR "Гүйлгээний дүн" OR "Гүйлгээний утга") newer_than:93d';

const b64 = (b) => Buffer.from(b).toString('base64url');

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw Object.assign(new Error('SESSION_SECRET is not set'), { status: 500 });
  return s;
}
function signToken(uid) {
  const body = b64(JSON.stringify({ uid, exp: Date.now() + SESSION_DAYS * 864e5 }));
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyToken(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const good = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig); const c = Buffer.from(good);
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) return null;
  const p = JSON.parse(base64UrlDecode(body));
  return p.exp > Date.now() ? p : null;
}

const newClient = () => new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.REDIRECT_URI);

function mount(app, { pool }) {
  if (!pool) return;
  let ready;
  const ensure = () => (ready ||= pool.query(`
    CREATE TABLE IF NOT EXISTS xypa_users (
      id TEXT PRIMARY KEY, google_sub TEXT UNIQUE NOT NULL, email TEXT, name TEXT,
      refresh_token TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS xypa_auth_state (
      nonce TEXT PRIMARY KEY, kind TEXT NOT NULL, redirect TEXT NOT NULL, user_id TEXT, expires TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS xypa_auth_codes (
      code TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires TIMESTAMPTZ NOT NULL)`));

  const wrap = (fn) => async (req, res) => {
    try { await ensure(); await fn(req, res); } catch (e) {
      console.error(e);
      if (!res.headersSent) res.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong.' });
    }
  };
  const authed = (fn) => wrap(async (req, res) => {
    const t = (req.headers.authorization || '').replace(/^Bearer /, '');
    const p = verifyToken(t);
    if (!p) return res.status(401).json({ error: 'Please sign in again.' });
    const { rows } = await pool.query('SELECT * FROM xypa_users WHERE id = $1', [p.uid]);
    if (!rows[0]) return res.status(401).json({ error: 'Please sign in again.' });
    req.user = rows[0];
    return fn(req, res);
  });
  const gmailFor = (user) => {
    if (!user.refresh_token) throw Object.assign(new Error('Gmail is not connected.'), { status: 409 });
    const c = newClient();
    c.setCredentials({ refresh_token: user.refresh_token });
    return google.gmail({ version: 'v1', auth: c });
  };

  // 1) The app asks for a Google URL. kind = signin (name + email only) or gmail (read-only inbox, later and separate).
  app.post('/v2/auth/begin', wrap(async (req, res) => {
    const { kind, redirect } = req.body || {};
    if (!['signin', 'gmail'].includes(kind) || !APP_REDIRECT.test(redirect || '')) return res.status(400).json({ error: 'Bad request.' });
    let userId = null;
    if (kind === 'gmail') {
      const p = verifyToken((req.headers.authorization || '').replace(/^Bearer /, ''));
      if (!p) return res.status(401).json({ error: 'Please sign in first.' });
      userId = p.uid;
    }
    const nonce = crypto.randomBytes(24).toString('hex');
    await pool.query("INSERT INTO xypa_auth_state VALUES ($1,$2,$3,$4, now() + interval '10 minutes')", [nonce, kind, redirect, userId]);
    const url = newClient().generateAuthUrl({
      access_type: 'offline',
      prompt: kind === 'gmail' ? 'consent' : 'select_account',
      include_granted_scopes: true,
      state: nonce,
      scope: kind === 'gmail' ? ['openid', 'email', 'https://www.googleapis.com/auth/gmail.readonly'] : ['openid', 'email', 'profile'],
    });
    res.json({ url });
  }));

  // 2) Google sends the person back to the shared /auth/callback, which hands `state` requests here.
  const callback = wrap(async (req, res) => {
    const { code, state, error } = req.query;
    const { rows } = await pool.query('DELETE FROM xypa_auth_state WHERE nonce = $1 AND expires > now() RETURNING *', [state]);
    const st = rows[0];
    if (!st) return res.status(400).send('This sign-in link expired. Go back to xypa and try again.');
    const back = (params) => res.redirect(`${st.redirect}${st.redirect.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`);
    if (error || !code) return back({ error: error || 'cancelled' });
    const client = newClient();
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const g = ticket.getPayload();
    let user;
    if (st.user_id) {
      const r = await pool.query('SELECT * FROM xypa_users WHERE id = $1', [st.user_id]);
      user = r.rows[0];
      if (!user || user.google_sub !== g.sub) return back({ error: 'wrong_account' });
    } else {
      const id = crypto.randomUUID();
      const r = await pool.query(
        `INSERT INTO xypa_users (id, google_sub, email, name) VALUES ($1,$2,$3,$4)
         ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name RETURNING *`, [id, g.sub, g.email, g.name || null]);
      user = r.rows[0];
    }
    if (st.kind === 'gmail') {
      if (!tokens.refresh_token) return back({ error: 'no_refresh_token' });
      await pool.query('UPDATE xypa_users SET refresh_token = $1 WHERE id = $2', [tokens.refresh_token, user.id]);
    }
    const oneTime = crypto.randomBytes(24).toString('hex');
    await pool.query("INSERT INTO xypa_auth_codes VALUES ($1,$2, now() + interval '5 minutes')", [oneTime, user.id]);
    back({ code: oneTime, kind: st.kind });
  });
  module.exports.callback = callback;

  // 3) The app swaps the one-time code for a session token.
  app.post('/v2/auth/exchange', wrap(async (req, res) => {
    const { rows } = await pool.query('DELETE FROM xypa_auth_codes WHERE code = $1 AND expires > now() RETURNING user_id', [(req.body || {}).code]);
    if (!rows[0]) return res.status(400).json({ error: 'Code expired.' });
    const u = (await pool.query('SELECT * FROM xypa_users WHERE id = $1', [rows[0].user_id])).rows[0];
    res.json({ token: signToken(u.id), user: { email: u.email, name: u.name, gmailConnected: !!u.refresh_token } });
  }));

  app.get('/v2/me', authed(async (req, res) => {
    const u = req.user;
    res.json({ email: u.email, name: u.name, gmailConnected: !!u.refresh_token });
  }));

  app.delete('/v2/gmail', authed(async (req, res) => {
    if (req.user.refresh_token) {
      try { await newClient().revokeToken(req.user.refresh_token); } catch (e) { /* already revoked */ }
    }
    await pool.query('UPDATE xypa_users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    res.json({ ok: true });
  }));

  app.delete('/v2/me', authed(async (req, res) => {
    if (req.user.refresh_token) { try { await newClient().revokeToken(req.user.refresh_token); } catch (e) { /* ignore */ } }
    await pool.query('DELETE FROM xypa_users WHERE id = $1', [req.user.id]);
    res.json({ ok: true });
  }));

  // Scanning is split into small calls (list ids, then parse batches) so each one stays well inside serverless time limits.
  app.get('/v2/scan/ids', authed(async (req, res) => {
    const gmail = gmailFor(req.user);
    const r = await gmail.users.messages.list({ userId: 'me', q: SCAN_QUERY, maxResults: 200, pageToken: req.query.page || undefined });
    res.json({ ids: (r.data.messages || []).map((m) => m.id), next: r.data.nextPageToken || null });
  }));

  app.post('/v2/scan/batch', authed(async (req, res) => {
    const ids = ((req.body || {}).ids || []).slice(0, 25);
    const gmail = gmailFor(req.user);
    const out = await Promise.all(ids.map(async (id) => {
      try {
        const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
        const h = (n) => msg.data.payload.headers.find((x) => x.name === n)?.value || '';
        return parseAlert({ id, from: h('From'), subject: h('Subject'), dateHeader: h('Date'), body: decodeBody(msg.data.payload) || msg.data.snippet || '' });
      } catch (e) { return null; }
    }));
    res.json({ transactions: out.filter(Boolean), read: ids.length });
  }));
}

module.exports = { mount, callback: null, signToken, verifyToken };
