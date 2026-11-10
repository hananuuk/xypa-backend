import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { IconButton, PillBar } from './Primitives';
import { colors, font } from './tokens';

/** Full-screen route: page background, header pill with back button, scrolling content. */
export function ScreenFrame({ title, onBack, right, children, footer, scroll = true }: {
  title: string; onBack: () => void; right?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const body = scroll
    ? <ScrollView style={s.fill} contentContainerStyle={[s.content, { paddingBottom: footer ? 24 : insets.bottom + 110 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
    : <View style={[s.fill, s.content]}>{children}</View>;
  return (
    <View style={[s.fill, { paddingTop: insets.top + 8 }]}>
      <View style={s.head}>
        <PillBar
          left={
            <View style={s.titleRow}>
              <IconButton label="Back" onPress={onBack}><Icon name="chevronLeft" size={20} /></IconButton>
              <Text style={s.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
            </View>
          }
          right={right}
        />
      </View>
      {body}
      {footer ? <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{footer}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  head: { paddingHorizontal: 16, paddingBottom: 4 },
  content: { paddingHorizontal: 16, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: font.medium, fontSize: 20, color: colors.ink, flexShrink: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 10 },
});
