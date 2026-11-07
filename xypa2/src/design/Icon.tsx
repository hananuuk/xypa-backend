import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from './tokens';

export type IconName =
  | 'envelope' | 'target' | 'plus' | 'pie' | 'bank' | 'eye' | 'eyeOff' | 'chevronDown' | 'chevronRight'
  | 'chevronLeft' | 'close' | 'check' | 'list' | 'grid' | 'settings' | 'sparkle';

/** Simple 2px-stroke line icons with rounded caps (spec §2.4). */
export function Icon({ name, size = 22, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'envelope' && (<><Rect x={3} y={5.5} width={18} height={13} rx={2.5} {...p} /><Path d="M3.5 7.5l8.5 6 8.5-6" {...p} /></>)}
      {name === 'target' && (<><Circle cx={12} cy={12} r={8.5} {...p} /><Circle cx={12} cy={12} r={4.5} {...p} /><Circle cx={12} cy={12} r={0.8} {...p} /></>)}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} />}
      {name === 'pie' && (<><Path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z" {...p} /><Path d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15z" {...p} /></>)}
      {name === 'bank' && (<><Path d="M3 9.5L12 4l9 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 20h17" {...p} /></>)}
      {name === 'eye' && (<><Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...p} /><Circle cx={12} cy={12} r={2.8} {...p} /></>)}
      {name === 'eyeOff' && (<><Path d="M4 4l16 16M10.2 6a9.6 9.6 0 0 1 1.8-.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.3M6.5 7.7C4 9.6 2.5 12 2.5 12S6 18.5 12 18.5c1.4 0 2.7-.3 3.8-.8" {...p} /></>)}
      {name === 'chevronDown' && <Path d="M6 9.5l6 6 6-6" {...p} />}
      {name === 'chevronRight' && <Path d="M9.5 6l6 6-6 6" {...p} />}
      {name === 'chevronLeft' && <Path d="M14.5 6l-6 6 6 6" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />}
      {name === 'list' && <Path d="M4 7h16M4 12h16M4 17h16" {...p} />}
      {name === 'grid' && (<><Rect x={4} y={4} width={6.5} height={6.5} rx={1.5} {...p} /><Rect x={13.5} y={4} width={6.5} height={6.5} rx={1.5} {...p} /><Rect x={4} y={13.5} width={6.5} height={6.5} rx={1.5} {...p} /><Rect x={13.5} y={13.5} width={6.5} height={6.5} rx={1.5} {...p} /></>)}
      {name === 'settings' && (<><Circle cx={12} cy={12} r={3} {...p} /><Path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" {...p} /></>)}
      {name === 'sparkle' && <Path d="M12 3.5l1.8 5.7 5.7 1.8-5.7 1.8L12 18.5l-1.8-5.7L4.5 11l5.7-1.8z" {...p} />}
    </Svg>
  );
}
