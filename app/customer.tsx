import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CustomerAvatar } from '../src/components/customer-avatar';
import { MonthPicker } from '../src/components/month-picker';
import { Button, Choice, ErrorText, Icon, IconButton, Label, Screen, useWords } from '../src/components/ui';
import { changeRegister, newId, useRegister } from '../src/data/store';
import { ledger, prepareMonth, summarizeBill } from '../src/domain/billing';
import { billCharge, billLineCharge, currentProfile, lastCompletedMonth, money, monthKey, monthLabel, withCopyCount } from '../src/domain/model';
import { colors, sizes, spacing } from '../src/theme';

function AmountRow({ title, amount, detail, subtotal, stacked, edit }: {
  title: string;
  amount: number;
  detail?: string;
  subtotal?: boolean;
  stacked: boolean;
  edit?: { label: string; onPress: () => void };
}) {
  return <View style={[styles.amountRow, subtotal && styles.subtotal]}>
    <View style={[styles.amountContents, stacked && styles.stackedAmount]}>
      <View style={stacked ? styles.stackedRowLabel : styles.rowLabel}>
        <Label bold={subtotal}>{title}</Label>
        {detail && <Label variant="secondary" style={styles.supporting}>{detail}</Label>}
      </View>
      <Label bold style={[styles.rowAmount, stacked && styles.stackedRowAmount]}>{money(amount)}</Label>
    </View>
    {edit && <Pressable accessibilityRole="button" accessibilityLabel={edit.label} onPress={edit.onPress}
      style={({ pressed }) => [styles.editItem, pressed && styles.pressed]}>
      <Icon name="edit" size={20} color={colors.blue} />
    </Pressable>}
  </View>;
}

export default function Customer() {
  const state = useRegister();
  const t = useWords();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / Math.max(fontScale, 1) < 345;
  const { id, month: requestedMonth } = useLocalSearchParams<{ id: string; month?: string }>();
  const [month, setMonth] = useState(requestedMonth ?? lastCompletedMonth());
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    changeRegister(draft => prepareMonth(draft, month, newId))
      .catch(reason => { if (active) setError(reason.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [month]);

  const household = state.households.find(entry => entry.id === id);
  if (!household) {
    return <Screen title={t('Household not found', 'വീട് കണ്ടെത്തിയില്ല')} back>
      <Label>{t('Return to your register.', 'രജിസ്റ്ററിലേക്ക് മടങ്ങുക.')}</Label>
    </Screen>;
  }

  const profile = currentProfile(household);
  const route = state.routes.find(entry => entry.id === profile.routeId)?.name;
  const stop = t('Stop', 'സ്ഥാനം') + '\u00a0' + String(profile.position).padStart(2, '0');
  const bills = state.bills.filter(entry => entry.customerId === id);
  const bill = bills.find(entry => entry.month === month);
  const summary = bill && summarizeBill(bill, ledger(state, id));
  const originalBeforeCorrections = bill?.preparedTotal;
  const corrected = originalBeforeCorrections !== undefined && originalBeforeCorrections !== summary?.original;
  const paperNames = new Map(state.periodicals.map(paper => [paper.id, paper.name]));
  const billMonths = new Map(bills.map(entry => [entry.id, entry.month]));
  const carry = bill?.carry.map(entry => ({ ...entry, month: billMonths.get(entry.billId) ?? '' }))
    .sort((left, right) => left.month.localeCompare(right.month));
  const balanceTitle = t('Balance and payments', 'ബാക്കിയും പണമടവുകളും');
  const paymentTitle = t('Record payment', 'പണം രേഖപ്പെടുത്തുക');
  const stillToCollect = t('Still to collect', 'ഇനി ലഭിക്കാനുള്ളത്');
  const options = [
    { value: 'edit', label: t('Edit household', 'വീട് തിരുത്തുക') },
    { value: 'balance', label: balanceTitle },
    ...(bill ? [
      { value: 'correct', label: t('Correct bill', 'ബിൽ തിരുത്തുക') },
      { value: 'writeoff', label: t('Write off this month’s dues', 'ഈ മാസത്തെ കുടിശ്ശിക ഒഴിവാക്കുക') },
    ] : []),
  ];
  const openBalance = () => router.push({ pathname: '/balance', params: { id } });
  function openAdjustment(mode: string, item?: string) {
    if (bill) router.push({ pathname: '/adjustment', params: { id: bill.id, mode, ...(item === undefined ? {} : { item }) } });
  }

  return <Screen canvas footer={<Button title={paymentTitle} icon="payment"
    onPress={() => router.push({ pathname: '/payment', params: { id, month } })} />}>
    <View style={styles.header}>
      <IconButton name="arrow-back" label={t('Back', 'തിരികെ')}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/routes')} />
      <CustomerAvatar id={id} name={profile.name} />
      <View style={styles.identity}>
        <Label bold accessibilityRole="header" style={styles.customerTitle}>{profile.name}</Label>
        <Label variant="secondary" style={styles.supporting}>{route ? route + ' · ' : ''}{stop}</Label>
      </View>
      <IconButton name="more-vert" label={t('Customer actions', 'ഉപഭോക്തൃ പ്രവർത്തനങ്ങൾ')} onPress={() => setMenu(true)} />
    </View>
    <MonthPicker compact value={month} maxMonth={monthKey(new Date())} onChange={setMonth} />
    <ErrorText message={error} />
    {bill && summary ? <>
      <View style={[styles.summary, summary.remaining > 0 && styles.dueSummary]}>
        <Label variant="headline" bold>{stillToCollect}</Label>
        <Label bold accessibilityLiveRegion="polite"
          style={[styles.primaryAmount, summary.remaining > 0 && styles.dueAmount]}>{money(summary.remaining)}</Label>
        <View style={[styles.metrics, stacked && styles.stackedMetrics]}>
          <View style={[styles.metric, !stacked && styles.sideMetric]}>
            <Label variant="secondary" style={styles.supporting}>{corrected ? t('Corrected amount due', 'തിരുത്തിയ ബിൽ തുക') :
              t('Original amount due', 'ആദ്യ ബിൽ തുക')}</Label>
            <Label bold style={styles.supportingAmount}>{money(summary.original)}</Label>
            {corrected && <Label variant="secondary" style={styles.supporting}>
              {t('Originally', 'ആദ്യ ബിൽ തുക')} {money(originalBeforeCorrections)}
            </Label>}
          </View>
          <View style={[styles.metric, !stacked && styles.sideMetric]}>
            <Label variant="secondary" style={styles.supporting}>{t('Paid or adjusted since', 'അടച്ചതോ കുറച്ചതോ')}</Label>
            <Label bold style={styles.supportingAmount}>{money(summary.settled)}</Label>
          </View>
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.sectionHeading}>
          <MaterialCommunityIcons name="book-open-variant" size={sizes.icon} color={colors.blue} />
          <Label variant="headline" bold accessibilityRole="header" style={styles.sectionTitle}>{t('Bill breakdown', 'ബിൽ വിശദാംശങ്ങൾ')}</Label>
        </View>
        {bill.opening === undefined ? <>
          {bill.lines.map((line, index) => {
            const name = paperNames.get(line.periodicalId);
            const title = withCopyCount(name ? name + ' (' + line.code + ')' : line.code, line.quantity);
            return <AmountRow key={line.periodicalId + '-' + index} title={title} amount={billLineCharge(line)} stacked={stacked}
              edit={{ label: t('Edit', 'തിരുത്തുക') + ' ' + title, onPress: () => openAdjustment('edit-paper', String(index)) }}
              detail={line.deduction > 0 ? t('Deduction', 'കിഴിവ്') + ' ' + money(line.deduction) : undefined} />;
          })}
          {bill.customItems?.map(item => <AmountRow key={item.id} title={item.name} amount={item.amount} stacked={stacked}
            detail={item.recurring ? t('Monthly custom item', 'പ്രതിമാസ ഇനം') : t('One-time item', 'ഒറ്റത്തവണ ഇനം')}
            edit={{ label: t('Edit', 'തിരുത്തുക') + ' ' + item.name, onPress: () => openAdjustment('edit-custom', item.id) }} />)}
          <AmountRow title={t('Monthly subtotal', 'ഈ മാസത്തെ ആകെ തുക')} amount={billCharge(bill)} subtotal stacked={stacked} />
          <Pressable accessibilityRole="button" onPress={() => openAdjustment('add')}
            style={({ pressed }) => [styles.addItem, pressed && styles.pressed]}>
            <Icon name="add" color={colors.blue} />
            <Label bold style={styles.addItemText}>{t('Add item', 'ഇനം ചേർക്കുക')}</Label>
          </Pressable>
        </> : <AmountRow title={t('Opening balance', 'മുൻ കുടിശ്ശിക')} amount={billCharge(bill)} subtotal stacked={stacked} />}
        {!!carry?.length && <View style={styles.carry}>
          <Label bold accessibilityRole="header" style={styles.subheading}>{t('Previous dues included when bill was prepared', 'ബിൽ തയ്യാറാക്കിയപ്പോൾ ഉൾപ്പെടുത്തിയ മുൻ കുടിശ്ശിക')}</Label>
          {carry.map(entry => <AmountRow key={entry.billId}
            title={entry.month ? monthLabel(entry.month, state.language) : t('Previous dues', 'മുൻ കുടിശ്ശിക')}
            amount={entry.amount} stacked={stacked} />)}
        </View>}
      </View>
    </> : busy ? <ActivityIndicator color={colors.blue} accessibilityLabel={t('Preparing bill', 'ബിൽ തയ്യാറാക്കുന്നു')} />
      : !error && <Label>{t('No bill prepared for this month.', 'ഈ മാസത്തെ ബിൽ തയ്യാറാക്കിയിട്ടില്ല.')}</Label>}
    <Pressable accessibilityRole="button" onPress={openBalance} style={({ pressed }) => [styles.card, styles.history, pressed && styles.pressed]}>
      <MaterialCommunityIcons name="database-outline" size={sizes.icon} color={colors.blue} />
      <View style={styles.historyText}>
        <Label bold>{balanceTitle}</Label>
        <Label variant="secondary" style={styles.supporting}>{t('View payment history and monthly balances', 'പണമടവ് ചരിത്രവും മാസത്തെ ബാക്കിയും കാണുക')}</Label>
      </View>
      <Icon name="chevron-right" />
    </Pressable>
    {menu && <Choice title={t('Customer actions', 'ഉപഭോക്തൃ പ്രവർത്തനങ്ങൾ')} options={options}
      onChoose={action => {
        if (action === 'edit') router.push({ pathname: '/household', params: { id } });
        else if (action === 'balance') openBalance();
        else openAdjustment(action);
      }}
      onDismiss={() => setMenu(false)} />}
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, marginHorizontal: -spacing.sm },
  identity: { flex: 1, gap: spacing.xs },
  customerTitle: { fontSize: 24 },
  supporting: { color: colors.muted },
  summary: { gap: spacing.xs, padding: spacing.lg, borderRadius: sizes.panelRadius, backgroundColor: colors.panel },
  dueSummary: { backgroundColor: colors.dueSurface },
  primaryAmount: { fontSize: 36, color: colors.darkBlue },
  dueAmount: { color: colors.error },
  metrics: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.divider },
  stackedMetrics: { flexDirection: 'column', gap: spacing.md },
  metric: { gap: spacing.xs },
  sideMetric: { flex: 1 },
  supportingAmount: { fontSize: 18, color: colors.darkBlue },
  card: { padding: spacing.md, borderRadius: sizes.panelRadius, borderWidth: 1, borderColor: colors.softBorder, backgroundColor: colors.surface },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  sectionTitle: { flex: 1 },
  subheading: { fontSize: 18 },
  amountRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.softBorder },
  amountContents: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stackedAmount: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.xs },
  rowLabel: { flex: 1, gap: spacing.xs },
  stackedRowLabel: { gap: spacing.xs },
  rowAmount: { maxWidth: '45%', textAlign: 'right', color: colors.darkBlue },
  stackedRowAmount: { maxWidth: '100%' },
  editItem: { minHeight: sizes.touch, minWidth: sizes.touch, marginLeft: spacing.xs, alignItems: 'center', justifyContent: 'center' },
  addItem: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  addItemText: { color: colors.blue, flexShrink: 1 },
  subtotal: { borderTopWidth: 0, borderRadius: sizes.radius, backgroundColor: colors.panel, marginTop: spacing.xs },
  carry: { marginTop: spacing.lg, gap: spacing.xs },
  history: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyText: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.65 },
});
