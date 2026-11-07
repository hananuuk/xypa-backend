const test = require('node:test');
const assert = require('node:assert');
const { parseAlert } = require('../alerts');

const base = { id: 'x', dateHeader: 'Tue, 05 Nov 2026 12:40:00 +0800' };

test('card payment with masked card and merchant', () => {
  const t = parseAlert({ ...base, from: 'M bank <alert@m-bank.mn>', subject: 'Гүйлгээний мэдэгдэл',
    body: 'Зарлага\nГүйлгээний дүн: 48,600.00MNT\nГүйлгээний утга: 4207********1728:NOMIN SUPERMARKET\nҮлдэгдэл: 2,301,400.00MNT' });
  assert.equal(t.bank, 'M bank');
  assert.equal(t.type, 'spend');
  assert.equal(t.merchant, 'NOMIN SUPERMARKET');
  assert.equal(t.card, '4207********1728');
  assert.equal(t.amount, 48600);
  assert.equal(t.date, '2026-11-05');
  assert.equal(t.balance, 2301400);
});

test('incoming transfer is income', () => {
  const t = parseAlert({ ...base, from: 'Golomt <no-reply@golomtbank.com>', subject: 'Гүйлгээний мэдэгдэл',
    body: 'Орлого\nГүйлгээний дүн: 3,200,000.00MNT\nГүйлгээний утга: Ануухан-с илгээв' });
  assert.equal(t.bank, 'Golomt');
  assert.equal(t.type, 'income');
  assert.equal(t.amount, 3200000);
});

test('no amount is skipped', () => {
  assert.equal(parseAlert({ ...base, from: 'x', subject: 'hello', body: 'no money here' }), null);
});
