import React from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextProps, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Host, BottomSheet, Column, Button as NativeButton, Text as NativeText, ScrollView as NativeScroll } from '@expo/ui';
import { useRegister } from '../data/store';
import { colors as c, spacing as s, sizes } from '../theme';

export function useWords() {
  const { language } = useRegister();
  return (en: string, ml: string) => language === 'ml' ? ml : en;
}
type LabelVariant = 'body' | 'secondary' | 'title' | 'pageTitle' | 'headline' | 'amount' | 'welcome';
const screenEdges = ['top', 'left', 'right', 'bottom'] as const;
const tabbedScreenEdges = ['top', 'left', 'right'] as const;
const tabBarEdges = ['bottom', 'left', 'right'] as const;
export function Label({ children, variant = 'body', bold, style, ...props }: TextProps & { variant?: LabelVariant; bold?: boolean }) {
  const { language } = useRegister();
  return <Text {...props} style={[{ color: c.ink, fontSize: sizes[variant],
    fontFamily: language === 'ml' ? (bold ? 'MalayalamBold' : 'Malayalam') : undefined,
    fontWeight: language === 'en' && bold ? '700' : undefined }, style]}>{children}</Text>;
}
export function Icon({ name, color = c.ink, size = sizes.icon }: { name: React.ComponentProps<typeof MaterialIcons>['name']; color?: string; size?: number }) {
  return <MaterialIcons name={name} color={color} size={size} />;
}
export function RoadIcon({ color, size = sizes.icon }: { color: string; size?: number }) {
  const stroke = Math.max(1.5, size * 0.075);
  const line = { width: stroke, backgroundColor: color, borderRadius: stroke };
  return <View accessible={false} style={{ width: size, height: size }}>
    <View style={[line, styles.roadEdge, { top: size * 0.08, height: size * 0.84, left: size * 0.19, transform: [{ rotate: '24deg' }] }]} />
    <View style={[line, styles.roadEdge, { top: size * 0.08, height: size * 0.84, right: size * 0.19, transform: [{ rotate: '-24deg' }] }]} />
    <View style={styles.roadCenter}>
      {[0, 1, 2].map(dash => <View key={dash} style={[line, { height: size * 0.15 }]} />)}
    </View>
  </View>;
}
export function IconButton({ name, label, onPress }: { name: React.ComponentProps<typeof MaterialIcons>['name']; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><Icon name={name} /></Pressable>;
}
export function Button({ title, onPress, secondary, disabled, busy, danger, icon }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; busy?: boolean; danger?: boolean;
  icon?: React.ComponentProps<typeof Icon>['name'];
}) {
  const foreground = disabled ? c.navigationInk : secondary ? c.ink : c.surface;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
    disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.button,
      { backgroundColor: disabled ? c.divider : danger ? c.error : secondary ? c.secondary : c.blue },
      pressed && styles.pressed]}>
    {busy ? <ActivityIndicator color={secondary ? c.blue : c.surface} /> : icon ?
      <View style={styles.buttonContent}>
        <Icon name={icon} color={foreground} />
        <Label bold style={{ color: foreground, textAlign: 'center', flexShrink: 1 }}>{title}</Label>
      </View> : <Label bold style={{ color: foreground, textAlign: 'center' }}>{title}</Label>}
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
export function Screen({ title, children, back = false, footer, tabs, scroll = true, right, canvas, titleVariant = 'title' }: {
  title?: React.ReactNode; children: React.ReactNode; back?: boolean; footer?: React.ReactNode; tabs?: 'routes' | 'customers' | 'manage'; scroll?: boolean; right?: React.ReactNode;
  canvas?: boolean; titleVariant?: LabelVariant;
}) {
  const t = useWords();
  const { language } = useRegister();
  return <View style={[styles.screen, canvas && { backgroundColor: c.canvas }]}>
    <SafeAreaView style={styles.screenContent} edges={tabs ? tabbedScreenEdges : screenEdges}>
      <KeyboardAvoidingView style={styles.screenContent} behavior="padding">
        {title && <View style={styles.header}>
          {back && <IconButton name="arrow-back" label={t('Back', 'തിരികെ')} onPress={() => router.canGoBack() ? router.back() : router.replace('/routes')} />}
          <Label variant={titleVariant} bold style={{ flex: 1 }}>{title}</Label>{right}
        </View>}
        {scroll ? <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView> :
          <View style={{ flex: 1, paddingHorizontal: s.lg }}>{children}</View>}
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
    {tabs && <SafeAreaView style={styles.tabs} edges={tabBarEdges} accessibilityRole="tablist">
      {([
        ['routes', t('Routes', 'റൂട്ടുകൾ')],
        ['customers', t('Customers', 'ഉപഭോക്താക്കൾ')],
        ['manage', t('Manage', 'ക്രമീകരണം')],
      ] as const).map(([name, label]) => {
        const selected = tabs === name;
        const color = selected ? c.navigationActive : c.navigationInk;
        return <Pressable key={name} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }}
          onPress={() => router.replace('/' + name as never)}
          style={({ pressed }) => [styles.tab, language === 'ml' && name === 'customers' && styles.wideTab, pressed && styles.pressed]}>
          {name === 'routes' ? <RoadIcon color={color} size={26} /> :
            <MaterialCommunityIcons name={name === 'customers'
              ? (selected ? 'account-multiple' : 'account-multiple-outline')
              : (selected ? 'view-grid' : 'view-grid-outline')} color={color} size={26} />}
          <Label variant="secondary" bold={selected} style={[styles.tabLabel, { color }]}>{label}</Label>
        </Pressable>;
      })}
    </SafeAreaView>}
  </View>;
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
export function ErrorText({ message }: { message: string }) { return message ? <Label accessibilityRole="alert" style={{ color: c.error }}>{message}</Label> : null; }
export function showError(error: unknown) { Alert.alert('NMS', error instanceof Error ? error.message : String(error)); }
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  screenContent: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingHorizontal: s.lg, gap: s.sm },
  content: { flexGrow: 1, paddingHorizontal: s.lg, paddingBottom: s.xl, gap: s.lg },
  footer: { paddingHorizontal: s.lg, paddingVertical: s.lg, gap: s.md },
  button: { minHeight: sizes.touch, minWidth: sizes.touch, padding: s.md, borderRadius: sizes.radius, justifyContent: 'center', alignItems: 'center' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s.sm },
  iconButton: { width: sizes.touch, minHeight: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  input: { minHeight: sizes.touch, borderBottomWidth: 1, borderColor: c.divider, fontSize: sizes.body, color: c.ink, paddingVertical: s.sm },
  row: { minHeight: 60, paddingVertical: s.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.divider, flexDirection: 'row', alignItems: 'center', gap: s.md },
  denseRow: { minHeight: 56, paddingVertical: s.sm },
  roadEdge: { position: 'absolute' },
  roadCenter: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'space-evenly' },
  tabs: {
    flexDirection: 'row', paddingHorizontal: s.md, backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.softBorder,
  },
  tab: { flex: 1, alignItems: 'center', minHeight: 64, paddingHorizontal: s.xs, paddingVertical: s.sm, gap: s.xs },
  wideTab: { flex: 1.2 },
  tabLabel: { alignSelf: 'stretch', textAlign: 'center' },
});
