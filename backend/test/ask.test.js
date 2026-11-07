const test = require('node:test');
const assert = require('node:assert');
const { buildRequest, answer } = require('../ask');

test('request keeps alternating turns ending in the new question', () => {
  const r = buildRequest({ question: 'hi?', context: 'ctx', history: [{ role: 'assistant', text: 'x' }, { role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }] }, 'm');
  assert.deepStrictEqual(r.messages.map((m) => m.role), ['user', 'assistant', 'user']);
  assert.match(r.system, /ctx/);
});
test('missing key gives 503, empty question 400, success returns text', async () => {
  assert.strictEqual((await answer({ question: 'x' }, {})).status, 503);
  assert.strictEqual((await answer({ question: ' ' }, { key: 'k' })).status, 400);
  const ok = await answer({ question: 'x' }, { key: 'k', fetchImpl: async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'Yes.' }] }) }) });
  assert.strictEqual(ok.answer, 'Yes.');
});
