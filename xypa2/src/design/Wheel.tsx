import React, { useEffect, useRef } from 'react';
import { Animated, FlatList, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';
import { font } from './tokens';

const SHOWN = 5;

/**
 * A vertical picker: the value in the middle is big and solid, the ones around it fade out.
 * Scroll to choose; it snaps to a value.
 */
export function Wheel({ items, index, onIndex, width, itemHeight = 58, fontSize = 46, color = '#2F5BE0', label }: {
  items: string[]; index: number; onIndex: (i: number) => void; width: number; itemHeight?: number; fontSize?: number; color?: string; label: string;
}) {
  const H = itemHeight;
  const y = useRef(new Animated.Value(0)).current;
  const list = useRef<FlatList<string>>(null);
  const last = useRef(index);

  useEffect(() => {
    last.current = index;
    list.current?.scrollToOffset({ offset: index * H, animated: false });
  }, [H]); // eslint-disable-line react-hooks/exhaustive-deps

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / H)));
    if (i !== last.current) { last.current = i; onIndex(i); }
  };

  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: items[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const d = e.nativeEvent.actionName === 'increment' ? 1 : -1;
        const i = Math.max(0, Math.min(items.length - 1, index + d));
        list.current?.scrollToOffset({ offset: i * H, animated: true }); last.current = i; onIndex(i);
      }}
      style={{ width, height: H * SHOWN }}>
      <Animated.FlatList
        ref={list}
        data={items}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        getItemLayout={(_, i) => ({ length: H, offset: H * (i + 2), index: i })}
        ListHeaderComponent={<View style={{ height: H * 2 }} />}
        ListFooterComponent={<View style={{ height: H * 2 }} />}
        initialNumToRender={SHOWN + 4}
        windowSize={7}
        contentOffset={{ x: 0, y: index * H }}
        renderItem={({ item, index: i }) => {
          const r = [(i - 2) * H, (i - 1) * H, i * H, (i + 1) * H, (i + 2) * H];
          return (
            <Animated.Text numberOfLines={1} style={{
              height: H, lineHeight: H, textAlign: 'center', fontFamily: font.medium, fontSize, color,
              opacity: y.interpolate({ inputRange: r, outputRange: [0.08, 0.32, 1, 0.32, 0.08], extrapolate: 'clamp' }),
              transform: [{ scale: y.interpolate({ inputRange: r, outputRange: [0.62, 0.82, 1, 0.82, 0.62], extrapolate: 'clamp' }) }],
            }}>{item}</Animated.Text>
          );
        }}
      />
    </View>
  );
}
