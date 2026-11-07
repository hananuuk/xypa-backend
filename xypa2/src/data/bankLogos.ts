import type { ImageSourcePropType } from 'react-native';

/**
 * Official logo files go in assets/banks/<id>.png (square, at least 256px), then get listed here, e.g.
 *   khan: require('../../assets/banks/khan.png'),
 * Anything not listed shows the bank's initials instead. Use each bank's own brand or press kit.
 */
export const BANK_LOGOS: Partial<Record<string, ImageSourcePropType>> = {
  khan: require('../../assets/banks/khan.png'),
  golomt: require('../../assets/banks/golomt.png'),
  tdb: require('../../assets/banks/tdb.png'),
  xac: require('../../assets/banks/xac.png'),
  state: require('../../assets/banks/state.png'),
  mbank: require('../../assets/banks/mbank.png'),
  bogd: require('../../assets/banks/bogd.png'),
};
