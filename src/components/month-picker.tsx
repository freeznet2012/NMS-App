import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button as NativeButton, Column, Host, ScrollView, Text as NativeText } from '@expo/ui';
import { Box, ModalBottomSheet, Row, Shape, Surface } from '@expo/ui/jetpack-compose';
import { defaultMinSize, fillMaxWidth, padding, semantics, weight } from '@expo/ui/jetpack-compose/modifiers';
import { useRegister } from '../data/store';
import { monthKey, monthLabel } from '../domain/model';
import { colors, sizes, spacing } from '../theme';
import { Icon, Label, useWords } from './ui';

const cornerRadius = sizes.panelRadius;
const shape = Shape.RoundedCorner({ cornerRadii: {
  topStart: cornerRadius, topEnd: cornerRadius, bottomStart: cornerRadius, bottomEnd: cornerRadius,
} });

type MonthSheetProps = {
  title: string;
  value?: string;
  initialMonth?: string;
  maxMonth?: string;
  availableMonths?: readonly string[];
  automatic?: { label: string; onPress: () => void };
  onChoose: (month: string) => void;
  onDismiss: () => void;
};

export function MonthSheet({
  title, value, initialMonth, maxMonth, availableMonths, automatic, onChoose, onDismiss,
}: MonthSheetProps) {
  const { language } = useRegister();
  const t = useWords();
  const available = availableMonths && [...availableMonths].sort();
  const first = available?.[0];
  const last = available?.at(-1) ?? maxMonth;
  const [year, setYear] = useState(() =>
    Number((value ?? (initialMonth && (!last || initialMonth <= last) && (!first || initialMonth >= first) ? initialMonth : last) ?? monthKey(new Date())).slice(0, 4)));
  const disabledPrevious = year <= (first ? Number(first.slice(0, 4)) : 1000);
  const disabledNext = year >= (last ? Number(last.slice(0, 4)) : 9999);
  const locale = language === 'ml' ? 'ml-IN' : 'en-IN';

  function yearButton(direction: -1 | 1, disabled: boolean) {
    const label = direction < 0 ? t('Previous year', 'മുൻ വർഷം') : t('Next year', 'അടുത്ത വർഷം');
    return <Surface shape={shape} color={colors.secondary} border={{ color: colors.softBorder }}
      enabled={!disabled} onClick={() => setYear(y => y + direction)}
      modifiers={[semantics({ contentDescription: label })]}>
      <Box contentAlignment="center" modifiers={[defaultMinSize({ minWidth: sizes.touch, minHeight: sizes.touch })]}>
        <NativeText textStyle={{ fontSize: sizes.title, color: disabled ? colors.disabledText : colors.ink }}>
          {direction < 0 ? '‹' : '›'}
        </NativeText>
      </Box>
    </Surface>;
  }

  return <Host style={{ position: 'absolute' }} pointerEvents="none">
    <ModalBottomSheet skipPartiallyExpanded onDismissRequest={onDismiss} containerColor={colors.surface}>
      <ScrollView showsIndicators={false}>
        <Column spacing={spacing.xl} modifiers={[fillMaxWidth(), padding(spacing.lg, spacing.sm, spacing.lg, spacing.xl)]}>
          <NativeText textStyle={{ fontSize: sizes.title, fontWeight: 'bold', color: colors.ink }}>{title}</NativeText>
          <Row horizontalArrangement="spaceEvenly" verticalAlignment="center" modifiers={[fillMaxWidth()]}>
            {yearButton(-1, disabledPrevious)}
            <NativeText textStyle={{ fontSize: sizes.pageTitle, fontWeight: 'bold', color: colors.ink }}>{String(year)}</NativeText>
            {yearButton(1, disabledNext)}
          </Row>
          <Column spacing={spacing.md}>
            {[0, 1, 2, 3].map(row => <Row key={row}
              horizontalArrangement={{ spacedBy: spacing.sm }} modifiers={[fillMaxWidth()]}>
              {[0, 1, 2].map(column => {
                const index = row * 3 + column;
                const month = `${year}-${String(index + 1).padStart(2, '0')}`;
                const selected = value === month;
                const disabled = (maxMonth !== undefined && month > maxMonth) ||
                  (availableMonths !== undefined && !availableMonths.includes(month));
                const label = new Date(year, index, 1).toLocaleDateString(locale, { month: 'short' });
                return <Surface key={month} shape={shape} color={selected ? colors.blue : colors.secondary}
                  selected={selected} enabled={!disabled} onClick={() => onChoose(month)}
                  modifiers={[weight(1), semantics({ contentDescription: monthLabel(month, language) })]}>
                  <Box contentAlignment="center" modifiers={[fillMaxWidth(), defaultMinSize({ minHeight: sizes.touch }),
                    padding(spacing.xs, spacing.sm, spacing.xs, spacing.sm)]}>
                    <NativeText textStyle={{ fontSize: sizes.headline, fontWeight: 'bold', textAlign: 'center',
                      color: selected ? colors.surface : disabled ? colors.disabledText : colors.ink }}>
                      {selected ? label + ' ✓' : label}
                    </NativeText>
                  </Box>
                </Surface>;
              })}
            </Row>)}
          </Column>
          {automatic && <NativeButton variant="outlined" onPress={automatic.onPress}>
            <NativeText textStyle={{ fontSize: sizes.body, color: colors.blue }}>{automatic.label}</NativeText>
          </NativeButton>}
        </Column>
      </ScrollView>
    </ModalBottomSheet>
  </Host>;
}

export function MonthPicker({ value, onChange, label, title, maxMonth, compact }: {
  value: string; onChange: (month: string) => void; label?: string; title?: string; maxMonth?: string; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { language } = useRegister();
  const t = useWords();
  const fieldLabel = label ?? t('Billing Month', 'ബില്ലിന്റെ മാസം');
  const selected = monthLabel(value, language);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${fieldLabel}, ${selected}`}
      onPress={() => setOpen(true)} style={({ pressed }) => [styles.trigger, compact && styles.compact, pressed && styles.pressed]}>
      <Icon name="calendar-today" color={colors.blue} />
      <View style={{ flex: 1 }}>
        {!compact && <Label variant="secondary" style={{ color: colors.muted }}>{fieldLabel}</Label>}
        <Label bold>{selected}</Label>
      </View>
      <Icon name="keyboard-arrow-down" />
    </Pressable>
    {open && <MonthSheet title={title ?? t('Select billing month', 'ബില്ലിന്റെ മാസം തിരഞ്ഞെടുക്കുക')}
      value={value} maxMonth={maxMonth} onDismiss={() => setOpen(false)}
      onChoose={month => { setOpen(false); if (month !== value) onChange(month); }} />}
  </>;
}

const styles = StyleSheet.create({
  trigger: { minHeight: 56, backgroundColor: colors.panel, borderRadius: sizes.panelRadius,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  compact: { minHeight: sizes.touch, gap: spacing.md },
  pressed: { opacity: 0.65 },
});
