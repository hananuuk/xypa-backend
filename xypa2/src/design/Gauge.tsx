import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from './tokens';

/**
 * Fuel-gauge strip: fill = left ÷ assigned, starts full and shrinks as you spend.
 * Soft grey, no pace marker. Overspent shows a full accent strip. Clipped by the parent's corners.
 */
export function Gauge({ fraction, overspent }: { fraction: number; overspent?: boolean }) {
  const f = overspent ? 1 : Math.max(0, Math.min(1, fraction));
  return (
    <View style={s.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[s.fill, { width: `${f * 100}%`, backgroundColor: overspent ? colors.accent : colors.gaugeFill }]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, backgroundColor: colors.gaugeTrack },
  fill: { height: 5 },
});
