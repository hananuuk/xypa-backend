const test = require('node:test');
const assert = require('node:assert');
process.env.SESSION_SECRET = 'test-secret';
const { signToken, verifyToken } = require('../v2');

test('token round-trips and rejects tampering', () => {
  const t = signToken('u1');
  assert.equal(verifyToken(t).uid, 'u1');
  assert.equal(verifyToken(t.slice(0, -2) + 'xx'), null);
  assert.equal(verifyToken('nope'), null);
});
