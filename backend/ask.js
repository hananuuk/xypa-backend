// Ask xypa (Pro): answers questions from a snapshot of the user's own numbers. Read-only; never moves money.
const SYSTEM = [
  'You are xypa, a calm money assistant inside a budgeting app used mostly in Mongolia.',
  "Answer ONLY from the data snapshot provided. If the snapshot does not contain the answer, say so plainly. Never invent transactions or numbers.",
  'You can read and explain; you cannot move money, change budgets or make payments. Never claim you did.',
  'For "can I afford X" questions, compare X to the relevant envelope or safe-to-spend figure and show the arithmetic briefly.',
  "Keep answers short (under 120 words), plain text, no markdown. Reply in the user's language (English or Mongolian). Use the currency given.",
  'You are not a financial adviser; for big decisions give the facts and let the person decide.',
].join(' ');

function buildRequest(body, model) {
  const q = String((body && body.question) || '').trim().slice(0, 500);
  if (!q) return null;
  const ctx = String((body && body.context) || '').slice(0, 12000);
  const hist = Array.isArray(body && body.history) ? body.history.slice(-6) : [];
  const messages = [];
  for (const h of hist) {
    const role = h && h.role === 'assistant' ? 'assistant' : 'user';
    const text = String((h && h.text) || '').slice(0, 1500);
    if (!text) continue;
    if (messages.length && messages[messages.length - 1].role === role) continue;
    messages.push({ role, content: text });
  }
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (messages.length && messages[messages.length - 1].role === 'user') messages.pop();
  messages.push({ role: 'user', content: q });
  return { model, max_tokens: 400, system: `${SYSTEM}\n\nDATA SNAPSHOT:\n${ctx}`, messages };
}

async function answer(body, { key, model = process.env.ASK_MODEL || 'claude-sonnet-5-5', fetchImpl = fetch } = {}) {
  const req = buildRequest(body, model);
  if (!req) return { status: 400, error: 'Ask a question first.' };
  if (!key) return { status: 503, error: 'Ask xypa is not switched on yet.' };
  const r = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(req),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('ask upstream', r.status, JSON.stringify(j).slice(0, 300)); return { status: 502, error: "Couldn't get an answer. Try again." }; }
  const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  return { status: 200, answer: text || "I couldn't find an answer in your data." };
}

module.exports = { buildRequest, answer };
