import React, { useEffect, useRef } from 'react';
import { Animated, FlatList, GestureResponderEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { font } from './tokens';

const SHOWN = 5;
const tick = () => { try { Haptics.selectionAsync(); } catch { /* no haptics on this device */ } };

/**
 * A vertical picker: the value in the middle is solid, the ones around it fade out.
 * Scroll to choose (it snaps and ticks), or tap a value. Tapping the chosen one moves it up or down by one.
 */
export function Wheel({ items, index, onIndex, width, itemHeight = 36, fontSize = 22, color = '#2F5BE0', label }: {
  items: string[]; index: number; onIndex: (i: number) => void; width: number; itemHeight?: number; fontSize?: number; color?: string; label: string;
}) {
  const H = itemHeight;
  const y = useRef(new Animated.Value(0)).current;
  const list = useRef<FlatList<string>>(null);
  const last = useRef(index);
  const ticked = useRef(index);
  const clamp = (i: number) => Math.max(0, Math.min(items.length - 1, i));

  // Keep the list in step with the value when it changes from outside (e.g. the unit changed and the number was capped).
  useEffect(() => {
    last.current = index; ticked.current = index;
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
      if (i !== ticked.current) { ticked.current = i; tick(); }
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
        extraData={index}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={H}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
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
          const press = (e: GestureResponderEvent) => {
            if (i !== index) go(i);
            else go(e.nativeEvent.locationY < H / 2 ? i - 1 : i + 1);
          };
          return (
            <Pressable onPress={press} accessible={false} style={{ height: H }}>
              <Animated.Text numberOfLines={1} style={{
                height: H, lineHeight: H, textAlign: 'center', fontFamily: font.medium, fontSize, color,
                opacity: y.interpolate({ inputRange: r, outputRange: [0.08, 0.32, 1, 0.32, 0.08], extrapolate: 'clamp' }),
                transform: [{ scale: y.interpolate({ inputRange: r, outputRange: [0.7, 0.85, 1, 0.85, 0.7], extrapolate: 'clamp' }) }],
              }}>{item}</Animated.Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
