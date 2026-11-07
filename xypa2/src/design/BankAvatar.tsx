import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { BANK_LOGOS } from '../data/bankLogos';
import { bankFor } from '../data/banks';
import { colors, font } from './tokens';

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** The bank's logo when we have one, otherwise its initials. Decorative: the account name is always next to it. */
export function BankAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const logo = BANK_LOGOS[bankFor(name)?.id ?? ''];
  return (
    <View style={[s.box, { width: size, height: size, borderRadius: size / 2 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {logo ? <Image source={logo} style={{ width: size, height: size }} resizeMode="cover" /> : <Text style={[s.text, { fontSize: size * 0.32 }]}>{initials(name)}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { fontFamily: font.medium, color: colors.ink2 },
});
