import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Host, ModalBottomSheet, Column, RNHostView } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, height, imePadding, padding, weight } from '@expo/ui/jetpack-compose/modifiers';
import { colors, spacing } from '../theme';
import { IconButton, Label, useWords } from './ui';

export function PaymentSheet({ title, preferredHeight, children, footer, onClose }: {
  title: string; preferredHeight: number; children: React.ReactNode; footer?: React.ReactNode; onClose: () => void;
}) {
  const t = useWords();
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const actionSpace = footer && fontScale >= 1.3 ? spacing.hero : 0;
  const sheetHeight = Math.min(windowHeight * 0.83, preferredHeight * Math.max(1, fontScale) + actionSpace + bottom);

  return <Host style={styles.host} pointerEvents="none">
    <ModalBottomSheet skipPartiallyExpanded containerColor={colors.surface} onDismissRequest={onClose}>
      <Column modifiers={[fillMaxWidth(), imePadding(), height(sheetHeight), padding(0, 0, 0, bottom)]}>
        <RNHostView modifiers={[fillMaxWidth(), weight(1)]}>
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.header}>
              <Label bold variant="headline" accessibilityRole="header" style={styles.heading}>{title}</Label>
              <IconButton name="close" label={t('Close', 'അടയ്ക്കുക')} onPress={onClose} />
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer && <View style={styles.footer}>{footer}</View>}
          </View>
        </RNHostView>
      </Column>
    </ModalBottomSheet>
  </Host>;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', width: '100%' },
  sheet: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { flex: 1 },
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: spacing.md, paddingBottom: spacing.md },
  footer: { paddingVertical: spacing.sm },
});
