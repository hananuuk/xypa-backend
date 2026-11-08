import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, GestureResponderEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { font } from './tokens';

const tick = () => { try { Haptics.selectionAsync(); } catch { /* no haptics on this device */ } };

/**
 * A vertical picker: the value in the middle is solid, the ones around it fade out.
 * Scroll to choose (it snaps and ticks), or tap a value. Tapping the chosen one moves it up or down by one.
 */
export function Wheel({ items, index, onIndex, width, itemHeight = 36, fontSize = 22, color = '#2F5BE0', label, rows = 5, curve, align = 'center', bend = 1, bold = false }: {
  items: string[]; index: number; onIndex: (i: number) => void; width: number; itemHeight?: number; fontSize?: number; color?: string; label: string;
  rows?: number; curve?: 'left' | 'right'; align?: 'left' | 'center' | 'right'; bend?: number; bold?: boolean;
}) {
  const H = itemHeight;
  const SHOWN = rows;
  const half = (rows - 1) / 2;
  const R = H * 3.8; // radius of the half circle the values sit on
  const [live, setLive] = useState(index);
  const y = useRef(new Animated.Value(0)).current;
  const list = useRef<FlatList<string>>(null);
  const last = useRef(index);
  const ticked = useRef(index);
  const clamp = (i: number) => Math.max(0, Math.min(items.length - 1, i));

  // Keep the list in step with the value when it changes from outside (e.g. the unit changed and the number was capped).
  useEffect(() => {
    last.current = index; ticked.current = index; setLive(index);
    list.current?.scrollToOffset({ offset: index * H, animated: false });
  }, [H, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (i: number, animated = true) => {
    i = clamp(i);
    list.current?.scrollToOffset({ offset: i * H, animated });
    if (i !== last.current) { last.current = i; ticked.current = i; tick(); onIndex(i); }
  };

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = clamp(Math.round(e.nativeEvent.contentOffset.y / H));
    if (i !== last.current) { last.current = i; onIndex(i); }
  };

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], {
    useNativeDriver: true,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = clamp(Math.round(e.nativeEvent.contentOffset.y / H));
      if (i !== ticked.current) { ticked.current = i; tick(); setLive(i); }
    },
  });

  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: items[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => go(index + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
      style={{ width, height: H * SHOWN }}>
      <Animated.FlatList
        ref={list}
        data={items}
        extraData={`${index}-${live}`}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={H}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        getItemLayout={(_, i) => ({ length: H, offset: H * (i + half), index: i })}
        ListHeaderComponent={<View style={{ height: H * half }} />}
        ListFooterComponent={<View style={{ height: H * half }} />}
        initialNumToRender={SHOWN + 4}
        windowSize={7}
        contentOffset={{ x: 0, y: index * H }}
        renderItem={({ item, index: i }) => {
          const r = [-3, -2, -1, 0, 1, 2, 3].map((d) => (i + d) * H);
          const press = (e: GestureResponderEvent) => {
            if (i !== index) go(i);
            else go(e.nativeEvent.locationY < H / 2 ? i - 1 : i + 1);
          };
          return (
            <Pressable onPress={press} accessible={false} style={{ height: H }}>
              <Animated.Text numberOfLines={1} style={{
                height: H, lineHeight: H, textAlign: align, fontFamily: bold && i === live ? font.bold : font.medium, fontSize, color,
                opacity: y.interpolate({ inputRange: r, outputRange: [0.12, 0.3, 0.6, 1, 0.6, 0.3, 0.12], extrapolate: 'clamp' }),
                transform: [
                  { translateX: curve ? y.interpolate({ inputRange: r, outputRange: [3, 2, 1, 0, 1, 2, 3].map((k) => (curve === 'left' ? -1 : 1) * (R - Math.sqrt(R * R - k * k * H * H)) * bend), extrapolate: 'clamp' }) : 0 },
                  { scale: y.interpolate({ inputRange: r, outputRange: [0.7, 0.8, 0.9, 1, 0.9, 0.8, 0.7], extrapolate: 'clamp' }) },
                ],
              }}>{item}</Animated.Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
