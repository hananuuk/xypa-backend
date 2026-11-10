import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

/** A soft blue haze at the top of the page, like light through water. Sits behind everything and fades into the page colour. */
export function Haze() {
  const { width } = useWindowDimensions();
  const h = 340;
  return (
    <Svg pointerEvents="none" width={width} height={h} style={s.haze}>
      <Defs>
        <RadialGradient id="hzA" cx={width * 0.15} cy={h * 0.02} rx={width * 0.8} ry={h * 0.62} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#3944D0" stopOpacity="0.2" /><Stop offset="1" stopColor="#3944D0" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="hzB" cx={width * 0.92} cy={h * 0.04} rx={width * 0.9} ry={h * 0.6} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#6EC6F5" stopOpacity="0.5" /><Stop offset="1" stopColor="#6EC6F5" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={h} fill="url(#hzA)" />
      <Rect width={width} height={h} fill="url(#hzB)" />
    </Svg>
  );
}

const s = StyleSheet.create({ haze: { position: 'absolute', top: 0, left: 0 } });
