import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextProps, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Host, BottomSheet, Column, Button as NativeButton, Text as NativeText, ScrollView as NativeScroll } from '@expo/ui';
import { useRegister } from '../data/store';
import { monthLabel, type Language } from '../domain/model';
import { colors as c, spacing as s, sizes } from '../theme';

export function useWords() {
  const { language } = useRegister();
  return (en: string, ml: string) => language === 'ml' ? ml : en;
}
export function Label({ children, variant = 'body', bold, style, ...props }: TextProps & { variant?: 'body' | 'secondary' | 'title' | 'amount' | 'welcome'; bold?: boolean }) {
  const { language } = useRegister();
  return <Text {...props} style={[{ color: c.ink, fontSize: sizes[variant],
    fontFamily: language === 'ml' ? (bold ? 'MalayalamBold' : 'Malayalam') : undefined,
    fontWeight: language === 'en' && bold ? '700' : undefined }, style]}>{children}</Text>;
}
export function Icon({ name, color = c.ink, size = sizes.icon }: { name: React.ComponentProps<typeof MaterialIcons>['name']; color?: string; size?: number }) {
  return <MaterialIcons name={name} color={color} size={size} />;
}
export function IconButton({ name, label, onPress }: { name: React.ComponentProps<typeof MaterialIcons>['name']; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><Icon name={name} /></Pressable>;
}
export function Button({ title, onPress, secondary, disabled, busy, danger }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; busy?: boolean; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
    disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.button,
      { backgroundColor: disabled ? c.divider : danger ? c.error : secondary ? c.secondary : c.blue },
      pressed && styles.pressed]}>
    {busy ? <ActivityIndicator color={secondary ? c.blue : c.surface} /> :
      <Label bold style={{ color: secondary ? c.ink : c.surface, textAlign: 'center' }}>{title}</Label>}
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { language } = useRegister();
  return <View style={{ gap: s.xs }}><Label variant="secondary">{label}</Label>
    <TextInput accessibilityLabel={label} placeholderTextColor={c.muted} {...props}
      style={[styles.input, { fontFamily: language === 'ml' ? 'Malayalam' : undefined }, props.style]} /></View>;
}
export function Row({ title, detail, right, onPress, dense = false }: { title: string; detail?: string; right?: string; onPress?: () => void; dense?: boolean }) {
  const content = <><View style={{ flex: 1 }}><Label bold>{title}</Label>{detail && <Label variant="secondary">{detail}</Label>}</View>
    {right && <Label bold>{right}</Label>}{onPress && <Icon name="chevron-right" />}</>;
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, dense && styles.denseRow, pressed && styles.pressed]}>{content}</Pressable> :
    <View style={[styles.row, dense && styles.denseRow]}>{content}</View>;
}
export function Screen({ title, children, back = false, footer, tabs, scroll = true, right }: {
  title?: React.ReactNode; children: React.ReactNode; back?: boolean; footer?: React.ReactNode; tabs?: 'routes' | 'customers' | 'manage'; scroll?: boolean; right?: React.ReactNode;
}) {
  const t = useWords();
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      {title && <View style={styles.header}>
        {back && <IconButton name="arrow-back" label={t('Back', 'തിരികെ')} onPress={() => router.canGoBack() ? router.back() : router.replace('/routes')} />}
        <Label variant="title" bold style={{ flex: 1 }}>{title}</Label>{right}
      </View>}
      {scroll ? <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView> :
        <View style={{ flex: 1, paddingHorizontal: s.lg }}>{children}</View>}
      {footer && <View style={styles.footer}>{footer}</View>}
    </KeyboardAvoidingView>
    {tabs && <View style={styles.tabs}>{(['routes', 'customers', 'manage'] as const).map((name, i) =>
      <Pressable key={name} accessibilityRole="tab" accessibilityState={{ selected: tabs === name }} onPress={() => router.replace('/' + name as never)} style={styles.tab}>
        <Icon name={(['home', 'people-outline', 'settings'] as const)[i]} color={tabs === name ? c.blue : c.ink} />
        <Label variant="secondary" bold={tabs === name} style={{ color: tabs === name ? c.blue : c.ink }}>
          {[t('Routes', 'റൂട്ടുകൾ'), t('Customers', 'ഉപഭോക്താക്കൾ'), t('Manage', 'ക്രമീകരണം')][i]}
        </Label>
      </Pressable>)}</View>}
  </SafeAreaView>;
}
export function Choice({ title, options, onChoose, onDismiss }: {
  title: string; options: { label: string; value: string }[]; onChoose: (value: string) => void; onDismiss: () => void;
}) {
  return <Host><BottomSheet isPresented onDismiss={onDismiss} containerColor={c.surface}>
    <NativeScroll><Column><NativeText>{title}</NativeText>
      {options.map((option, i) => <NativeButton key={option.value + i} variant="text" onPress={() => { onChoose(option.value); onDismiss(); }}><NativeText textStyle={{ fontSize: 16, color: c.blue }} style={{ paddingVertical: 12 }}>{option.label}</NativeText></NativeButton>)}
    </Column></NativeScroll>
  </BottomSheet></Host>;
}
export function MonthPicker({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const { language } = useRegister();
  const t = useWords();
  const options = Array.from({ length: 12 }, (_, i) => {
    const month = year + '-' + String(i + 1).padStart(2, '0');
    return { value: month, label: monthLabel(month, language) };
  });
  return <><Pressable accessibilityRole="button" accessibilityLabel={t('Billing month', 'ബില്ലിന്റെ മാസം')} onPress={() => setOpen(true)} style={styles.month}>
    <Label bold style={{ flex: 1 }}>{monthLabel(value, language)}</Label><Icon name="keyboard-arrow-down" />
  </Pressable>{open && <Choice title={t('Billing month', 'ബില്ലിന്റെ മാസം')} options={[
    { value: 'previous', label: '‹ ' + (year - 1) }, ...options, { value: 'next', label: (year + 1) + ' ›' },
  ]} onChoose={v => { if (v === 'previous' || v === 'next') { setYear(y => y + (v === 'previous' ? -1 : 1)); setTimeout(() => setOpen(true), 300); } else onChange(v); }} onDismiss={() => setOpen(false)} />}</>;
}
export function ErrorText({ message }: { message: string }) { return message ? <Label accessibilityRole="alert" style={{ color: c.error }}>{message}</Label> : null; }
export function showError(error: unknown) { Alert.alert('NMS', error instanceof Error ? error.message : String(error)); }
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingHorizontal: s.lg, gap: s.sm },
  content: { flexGrow: 1, paddingHorizontal: s.lg, paddingBottom: s.xl, gap: s.lg },
  footer: { paddingHorizontal: s.lg, paddingVertical: s.lg, gap: s.md },
  button: { minHeight: sizes.touch, minWidth: sizes.touch, padding: s.md, borderRadius: sizes.radius, justifyContent: 'center', alignItems: 'center' },
  iconButton: { width: sizes.touch, minHeight: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  input: { minHeight: sizes.touch, borderBottomWidth: 1, borderColor: c.divider, fontSize: sizes.body, color: c.ink, paddingVertical: s.sm },
  row: { minHeight: 60, paddingVertical: s.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.divider, flexDirection: 'row', alignItems: 'center', gap: s.md },
  denseRow: { minHeight: 56, paddingVertical: s.sm },
  tabs: { flexDirection: 'row', paddingTop: s.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.divider },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 64, padding: s.xs },
  month: { minHeight: sizes.touch, backgroundColor: c.selected, borderRadius: sizes.radius, paddingHorizontal: s.md, flexDirection: 'row', alignItems: 'center' },
});
