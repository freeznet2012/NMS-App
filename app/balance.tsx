import React, { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Choice, Icon, IconButton, Label, Screen, useWords } from '../src/components/ui';
import { useRegister } from '../src/data/store';
import { customerBalance } from '../src/domain/billing';
import { currentProfile, money, monthLabel } from '../src/domain/model';
import { colors, sizes, spacing } from '../src/theme';

function SectionHeading({ title, count, icon, color, compact }: {
  title: string;
  count: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  compact: boolean;
}) {
  return <View style={[styles.sectionHeading, compact && styles.stackedHeading]}>
    <View style={[styles.sectionTitle, !compact && styles.inlineTitle]}>
      <MaterialCommunityIcons name={icon} size={sizes.icon} color={color} />
      <Label variant="headline" bold accessibilityRole="header" style={styles.headingText}>{title}</Label>
    </View>
    <Label variant="secondary" style={styles.count}>{count}</Label>
  </View>;
}

export default function BalanceScreen() {
  const state = useRegister();
  const t = useWords();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width, fontScale } = useWindowDimensions();
  const compact = width / Math.max(fontScale, 1) < 355;
  const [showOtherMonths, setShowOtherMonths] = useState(false);
  const household = state.households.find(entry => entry.id === id);

  if (!household) {
    return <Screen title={t('Household not found', 'വീട് കണ്ടെത്തിയില്ല')} back>
      <Label>{t('Return to your register.', 'രജിസ്റ്ററിലേക്ക് മടങ്ങുക.')}</Label>
    </Screen>;
  }

  const profile = currentProfile(household);
  const route = state.routes.find(entry => entry.id === profile.routeId)?.name;
  const stop = t('Stop', 'സ്ഥാനം') + '\u00a0' + profile.position;
  const { outstanding, settledMonths, total, credit, payments } = customerBalance(state, id);
  const monthCount = outstanding.length === 1 ? t('1 month', '1 മാസം') : t(`${outstanding.length} months`, `${outstanding.length} മാസം`);
  const unpaidMonths = outstanding.length === 0 ? t('No unpaid months', 'കുടിശ്ശികയുള്ള മാസങ്ങളില്ല') :
    outstanding.length === 1 ? t('Across 1 unpaid month', 'കുടിശ്ശികയുള്ള 1 മാസം') :
      t(`Across ${outstanding.length} unpaid months`, `കുടിശ്ശികയുള്ള ${outstanding.length} മാസം`);
  const paymentCount = payments.length === 1 ? t('1 payment', '1 പണമടവ്') : t(`${payments.length} payments`, `${payments.length} പണമടവുകൾ`);
  const locale = state.language === 'ml' ? 'ml-IN' : 'en-IN';
  const otherMonths = t('Other billed months', 'മറ്റ് ബിൽ മാസങ്ങൾ');

  function openBill(month: string) {
    router.push({ pathname: '/customer', params: { id, month } });
  }

  return <Screen canvas>
    <View style={styles.header}>
      <IconButton name="arrow-back" label={t('Back', 'തിരികെ')}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/routes')} />
      <View style={styles.identity}>
        <Label bold accessibilityRole="header" style={styles.title}>{profile.name}{t('’s balance', ' — ബാക്കി')}</Label>
        <Label style={styles.supporting}>{route ? route + ' · ' : ''}{stop}</Label>
      </View>
      <IconButton name="more-vert" label={otherMonths} onPress={() => setShowOtherMonths(true)} />
    </View>

    <View style={[styles.summary, compact && styles.compactSummary]}>
      <MaterialCommunityIcons name="database-outline" color={colors.blue} size={36} />
      <View style={styles.summaryText}>
        <Label bold style={styles.supporting}>{t('Total still to collect', 'ഇനി ലഭിക്കാനുള്ള ആകെ തുക')}</Label>
        <Label bold variant="amount" accessibilityLiveRegion="polite" style={styles.total}>{money(total)}</Label>
        <Label style={styles.supporting}>{unpaidMonths}</Label>
      </View>
    </View>
    {credit > 0 && <View style={[styles.credit, compact && styles.stackedDetails]}>
      <Label style={styles.rowTitle}>{t('Customer credit', 'മുൻകൂർ തുക')}</Label>
      <Label bold style={styles.total}>{money(credit)}</Label>
    </View>}

    <View style={styles.section}>
      <SectionHeading title={t('Outstanding by month', 'മാസം തിരിച്ചുള്ള കുടിശ്ശിക')} count={monthCount}
        icon="clipboard-list-outline" color={colors.blue} compact={compact} />
      <View style={styles.card}>
        {outstanding.length === 0 && <Label style={styles.empty}>{t('No outstanding monthly balances.', 'മാസ കുടിശ്ശികയില്ല.')}</Label>}
        {outstanding.map(({ month, amount }, index) => <Pressable key={month} accessibilityRole="button" onPress={() => openBill(month)}
          style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}>
          <View style={[styles.details, compact && styles.stackedDetails]}>
            <Label bold style={[styles.rowTitle, !compact && styles.inlineTitle]}>{monthLabel(month, state.language)}</Label>
            <Label bold style={[styles.due, compact && styles.fullAmount]}>{money(amount)}</Label>
          </View>
          <Icon name="chevron-right" size={22} />
        </Pressable>)}
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading title={t('Recent payments', 'സമീപകാല പണമടവുകൾ')} count={paymentCount}
        icon="history" color={colors.paid} compact={compact} />
      <View style={styles.card}>
        {payments.length === 0 && <Label style={styles.empty}>{t('No payments recorded yet.', 'ഇതുവരെ പണമടവ് രേഖപ്പെടുത്തിയിട്ടില്ല.')}</Label>}
        {payments.map((payment, index) => {
          const entered = new Date(payment.enteredAt);
          const date = entered.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
          const time = entered.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
          return <Pressable key={payment.id} accessibilityRole="button"
            onPress={() => router.push({ pathname: '/payment-detail', params: { id: payment.id } })}
            style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}>
            <View style={styles.paymentIcon}>
              <MaterialCommunityIcons name="arrow-bottom-left" color={colors.paid} size={sizes.icon} />
            </View>
            <View style={[styles.details, compact && styles.stackedDetails]}>
              <View style={[styles.date, !compact && styles.inlineTitle]}>
                <Label bold style={styles.rowTitle}>{date}</Label>
                <Label variant="secondary" style={styles.supporting}>{time}</Label>
              </View>
              <Label bold style={[styles.paymentAmount, compact && styles.fullAmount]}>{money(payment.amount)}</Label>
            </View>
            <Icon name="chevron-right" size={22} />
          </Pressable>;
        })}
      </View>
    </View>

    {showOtherMonths && <Choice title={settledMonths.length ? otherMonths : t('No other billed months', 'മറ്റ് ബിൽ മാസങ്ങളില്ല')}
      options={settledMonths.map(month => ({ value: month, label: monthLabel(month, state.language) }))}
      onChoose={openBill} onDismiss={() => setShowOtherMonths(false)} />}
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, marginHorizontal: -spacing.sm },
  identity: { flex: 1, gap: spacing.xs },
  title: { fontSize: 24 },
  supporting: { color: colors.navigationInk },
  summary: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.lg, borderRadius: sizes.panelRadius, backgroundColor: colors.panel },
  compactSummary: { gap: spacing.sm },
  summaryText: { flex: 1, paddingLeft: spacing.lg, gap: spacing.xs, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: colors.divider },
  total: { color: colors.darkBlue },
  credit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.md, borderRadius: sizes.radius, backgroundColor: colors.paidSurface },
  section: { gap: spacing.md, marginTop: spacing.xs },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stackedHeading: { flexDirection: 'column', alignItems: 'flex-start' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.xs },
  inlineTitle: { flex: 1 },
  headingText: { flexShrink: 1 },
  count: { color: colors.navigationInk, backgroundColor: colors.panel, borderRadius: sizes.panelRadius, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: sizes.panelRadius, borderWidth: 1, borderColor: colors.softBorder, paddingHorizontal: spacing.md },
  row: { minHeight: sizes.touch, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  details: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stackedDetails: { flexDirection: 'column', alignItems: 'flex-start' },
  date: { gap: spacing.xs },
  rowTitle: { fontSize: 17 },
  due: { minWidth: 56, maxWidth: '48%', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: sizes.panelRadius, textAlign: 'center', backgroundColor: colors.dueSurface, color: colors.error, fontSize: 18 },
  paymentIcon: { width: 36, height: 36, borderRadius: sizes.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paidSurface },
  paymentAmount: { maxWidth: '48%', color: colors.paid, fontSize: 18 },
  fullAmount: { maxWidth: '100%' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.softBorder },
  empty: { color: colors.muted, paddingVertical: spacing.md },
  pressed: { opacity: 0.65 },
});
