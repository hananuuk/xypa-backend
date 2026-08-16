const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const TOKEN_PATH = path.join(__dirname, 'tokens.json');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

function loadTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
}

const existing = loadTokens();
if (existing) oauth2Client.setCredentials(existing);

oauth2Client.on('tokens', (tokens) => {
  const merged = { ...loadTokens(), ...tokens };
  saveTokens(merged);
});

// Step 1 of login: send the user to Google's consent screen
app.get('/auth/login', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly']
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
    saveTokens(tokens);
    res.send('Gmail connected. You can close this tab and go back to Ledger.');
  } catch (e) {
    console.error(e);
    res.status(500).send('Something went wrong connecting your Gmail. Try again.');
  }
});

app.get('/auth/status', (req, res) => {
  res.json({ connected: !!loadTokens() });
});

// Same amount-guessing logic as the app's paste-in parser
function findBestAmount(text) {
  const priorityWords = ['total', 'amount charged', 'you paid', 'order total', 'charged', 'amount due', 'grand total'];
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
  const all = [...text.matchAll(dollarRe)].map(m => parseFloat(m[1].replace(/,/g, '')));
  if (all.length) return Math.max(...all);
  return null;
}

function decodeBody(payload) {
  let body = '';
  function walk(part) {
    if (part.body && part.body.data) {
      body += Buffer.from(part.body.data, 'base64').toString('utf8');
    }
    if (part.parts) part.parts.forEach(walk);
  }
  walk(payload);
  return body;
}

// Pulls recent receipt-looking emails and parses them into transactions
app.get('/api/sync', async (req, res) => {
  const tokens = loadTokens();
  if (!tokens) return res.status(401).json({ error: 'Gmail not connected yet.' });
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const list = await gmail.users.messages.list({
      userId: 'me',
      q: '(receipt OR "order confirmation" OR "your order" OR invoice OR "payment confirmation") newer_than:30d',
      maxResults: 25
    });
    const messages = list.data.messages || [];
    const results = [];

    for (const m of messages) {
      const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
      const headers = msg.data.payload.headers;
      const fromHeader = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const dateHeader = headers.find(h => h.name === 'Date')?.value;
      const bodyText = decodeBody(msg.data.payload) || msg.data.snippet || '';
      const amount = findBestAmount(subject + '\n' + bodyText);
      if (amount === null) continue;

      const merchant = fromHeader.replace(/<.*>/, '').replace(/"/g, '').trim() || subject.slice(0, 40);

      results.push({
        gmailId: m.id,
        merchant,
        subject,
        amount,
        date: dateHeader ? new Date(dateHeader).toISOString().slice(0, 10) : null
      });
    }
    res.json({ transactions: results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not fetch Gmail messages.' });
  }
});

app.get('/', (req, res) => res.send('Ledger backend is running.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ledger backend listening on port ${PORT}`));
