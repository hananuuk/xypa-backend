import type { ImageSourcePropType } from 'react-native';

/**
 * Official logo files go in assets/banks/<id>.png (square, at least 256px), then get listed here, e.g.
 *   khan: require('../../assets/banks/khan.png'),
 * Anything not listed shows the bank's initials instead. Use each bank's own brand or press kit.
 */
export const BANK_LOGOS: Partial<Record<string, ImageSourcePropType>> = {};
