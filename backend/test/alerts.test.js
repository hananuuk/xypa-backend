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

// Layouts below are the real ones from M bank and Golomt (account numbers and names made up).
test('real M bank alert: expense with account number, no balance', () => {
  const t = parseAlert({ ...base, from: 'smartinfo <smartinfo15@m-bank.mn>', subject: 'М банĸ - Гүйлгээний мэдэгдэл',
    body: 'Таны дансанд зарлага хийгдлээ.\nИлгээгчийн мэдээлэл:\nИлгээсэн данс: 8000000001\nГүйлгээний мэдээлэл:\nГүйлгээний дүн: 23,000.00MNT\nГүйлгээний утга: 4207********1728:TLJ CENTRAL 2\n' });
  assert.equal(t.bank, 'M bank');
  assert.equal(t.type, 'spend');
  assert.equal(t.amount, 23000);
  assert.equal(t.merchant, 'TLJ CENTRAL 2');
  assert.equal(t.account, '8000000001');
  assert.equal(t.balance, null);
});

test('real Golomt e-banking mail: transfer between own accounts is not spending', () => {
  const t = parseAlert({ ...base, from: '<alert@golomtbank.com>', subject: 'Golomt Bank: E-Banking',
    body: 'Таны интернэт банкаар хийсэн гүйлгээний мэдээлэл.\nЛавлах дугаар: 449710704 Гүйлгээний огноо: 02-11-2026 20:56:59\nШилжүүлэгчийн мэдээлэл Хүлээн авагчийн мэдээлэл Гүйлгээний дүн Ханш\nГоломт Банк Голомт банк MNT 13,224.10\nГүйлгээний утга\nӨөрийн данс хооронд 1.0\nГүйлгээний төлөв Амжилттай' });
  assert.equal(t.bank, 'Golomt');
  assert.equal(t.type, 'transfer');
  assert.equal(t.amount, 13224);
});

test('only official banks count: a securities firm is not a bank', () => {
  const body = 'Гүйлгээний дүн: 50,000.00MNT Таны дансанд орлого хийгдлээ M bank';
  assert.equal(parseAlert({ ...base, from: 'M Securities <noreply@msecurities.mn>', subject: 'Гүйлгээний мэдэгдэл', body }), null);
  assert.equal(parseAlert({ ...base, from: 'TDB Capital <info@tdbcapital.mn>', subject: 'Гүйлгээний мэдэгдэл', body }), null);
  assert.equal(parseAlert({ ...base, from: 'Some Shop <receipt@shop.mn>', subject: 'Receipt', body }), null);
  assert.equal(parseAlert({ ...base, from: 'smartinfo <smartinfo15@m-bank.mn>', subject: 'Гүйлгээний мэдэгдэл', body }).bank, 'M bank');
});
