import { describe, expect, it } from 'vitest';
import { detectBankFromText, parseGolomtStatement, parseMbankStatement } from './bankStatements';

// Fixtures follow the real layouts (numbers and names are made up).
const mbank = `Хэвлэсэн огноо: 11/07/2026
Дансны хуулга
Дансны дугаар: 	8000000001 	Хамрах хугацаа: 	2026.08.09 – 2026.11.07
№ Гүйлгээний
огноо
Гүйлгээний
дугаар Гүйлгээний утга 	Харьцсан данс 	Орлого 	Зарлага 	Үлдэгдэл
1 2026-08-09
14:25:18 SMB000001 4207********1728:TLJ
CENTRAL 21,500.00 	518,834.47
2 2026-08-09
21:48:56 M00000002 	АНУНГОО-С ИЛГЭЭВ. MN1200390080
00031380 25,000.00 	543,834.47
3 2026-08-09
22:35:51 M00000003 М БАНК- Банк хооронд
шимтгэл 250.00 	543,584.47
4 2026-08-10
09:33:19 M00000004 qpay 971193915627947,
10766028, SALBAR1
MN5100150081
15105694 5,000.00 	538,584.47
Нийт орлого 	25,000.00₮
Нийт зарлага 	26,750.00₮
Эцсийн үлдэгдэл 	538,584.47₮
-- 2 of 2 --
Дансны хуулгын QR код болон дараах холбоосоор хандаж баталгаажуулна уу`;

const golomt = `GOLOMT BANK Printed date: 	2026/10/07
ACCOUNT STATEMENT
1600000002 [MNT] 	IBAN:
2026-04-01
300,000.00 Credit 	АНУУХАН-С ИЛГЭЭВ-МАГСАРЖАВ АНУУХАН (Rate:
1.0)
70,000.00 Debit 	SOCIALPAY ГҮЙЛГЭЭ (Rate: 1.0)
1,000.00 Debit 	522893******0028:31-03-2026 09:07:07:POS:UB CITY B
(Rate: 1.0)
300,000.00
71,000.00
DAILY INCOME
DAILY EXPENDITURE
6,240.41 	END OF DAY BALANCE
2026-04-02
200.00 Debit 	Charges for PORD Customer Payment :000562045892
(Rate: 1.0)
0.00
200.00
DAILY INCOME
DAILY EXPENDITURE
6,040.41 	END OF DAY BALANCE`;

describe('real statement layouts', () => {
  it('recognises the banks', () => {
    expect(detectBankFromText(mbank + ' М банк')).toBe('M bank');
    expect(detectBankFromText(golomt)).toBe('Golomt');
    expect(detectBankFromText('hello')).toBeNull();
  });
  it('reads M bank rows and matches the printed totals', () => {
    const r = parseMbankStatement(mbank);
    expect(r.meta.account).toBe('8000000001');
    expect(r.found).toHaveLength(4);
    expect(r.found[0]).toMatchObject({ merchant: 'TLJ CENTRAL', amount: 21500, type: 'spend', card: '4207********1728', date: '2026-08-09', balance: 518834 });
    expect(r.found[1]).toMatchObject({ merchant: 'Transfer', type: 'income', amount: 25000 });
    expect(r.found[2]).toMatchObject({ merchant: 'Bank fee', amount: 250, type: 'spend' });
    expect(r.found[3].merchant).toMatch(/^qpay/i);
    const out = r.found.filter((f) => f.type === 'spend').reduce((a, f) => a + f.amount, 0);
    expect(out).toBe(r.meta.totalOut);
  });
  it('reads Golomt rows with wrapped lines and card prefixes', () => {
    const r = parseGolomtStatement(golomt);
    expect(r.meta.account).toBe('1600000002');
    expect(r.found.map((f) => [f.merchant, f.amount, f.type])).toEqual([['Transfer', 300000, 'income'], ['SocialPay', 70000, 'spend'], ['UB CITY B', 1000, 'spend'], ['Bank fee', 200, 'spend']]);
    expect(r.found[2].card).toBe('522893******0028');
    expect(r.found[2].balance).toBe(6240);
  });
});
