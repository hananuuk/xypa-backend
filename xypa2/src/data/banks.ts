export type Bank = { id: string; name: string; nameMn: string; /** Lower-case fragments that identify this bank in an account name. */ match: string[] };

/**
 * Banks people in Mongolia use. Commercial banks follow the Wikipedia list (checked Nov 2026),
 * plus the State Bank, which serves retail customers. Check against Mongolbank's register before launch.
 */
export const BANKS: Bank[] = [
  { id: 'khan', name: 'Khan Bank', nameMn: 'Хаан банк', match: ['khan bank', 'хаан'] },
  { id: 'golomt', name: 'Golomt Bank', nameMn: 'Голомт банк', match: ['golomt', 'голомт'] },
  { id: 'tdb', name: 'Trade and Development Bank', nameMn: 'Худалдаа хөгжлийн банк', match: ['tdb', 'trade and development', 'худалдаа хөгжлийн', 'ххб'] },
  { id: 'xac', name: 'XacBank', nameMn: 'Хас банк', match: ['xacbank', 'xac bank', 'хас банк'] },
  { id: 'state', name: 'State Bank', nameMn: 'Төрийн банк', match: ['state bank', 'төрийн банк'] },
  { id: 'mbank', name: 'M bank', nameMn: 'М банк', match: ['m bank', 'mbank', 'м банк'] },
  { id: 'bogd', name: 'Bogd Bank', nameMn: 'Богд банк', match: ['bogd', 'богд'] },
  { id: 'arig', name: 'Arig Bank', nameMn: 'Ариг банк', match: ['arig', 'ариг'] },
  { id: 'nib', name: 'National Investment Bank', nameMn: 'Үндэсний хөрөнгө оруулалтын банк', match: ['national investment', 'nibank', 'ni bank', 'үндэсний хөрөнгө'] },
  { id: 'ckb', name: 'Chinggis Khaan Bank', nameMn: 'Чингис хаан банк', match: ['chinggis', 'ckbank', 'чингис'] },
  { id: 'credit', name: 'Credit Bank', nameMn: 'Кредит банк', match: ['credit bank', 'кредит банк'] },
  { id: 'trans', name: 'Trans Bank', nameMn: 'Транс банк', match: ['trans bank', 'транс банк'] },
];

export function bankFor(accountName: string): Bank | undefined {
  const n = accountName.toLowerCase();
  return BANKS.find((b) => b.match.some((m) => n.includes(m)));
}
