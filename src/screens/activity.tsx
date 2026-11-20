import React, { useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRegister } from '../data/store';
import { activityDay, activityKind, dayBefore, groupActivity, type ActivityKind, type ActivityRange } from '../domain/activity';
import { money, monthLabel, type Activity } from '../domain/model';
import { Choice, Icon, IconButton, Label, Screen, useWords } from '../components/ui';
import { colors, sizes, spacing } from '../theme';

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const themes: Record<ActivityKind, { icon: Glyph; tint: string; foreground: string }> = {
  payments: { icon: 'database-outline', tint: colors.paidSurface, foreground: colors.paid },
  bills: { icon: 'file-document-edit-outline', tint: '#EEE7FF', foreground: '#6641C5' },
  households: { icon: 'home-outline', tint: colors.selected, foreground: colors.blue },
  imports: { icon: 'cloud-upload-outline', tint: '#FDEBDD', foreground: '#99460B' },
  other: { icon: 'history', tint: colors.panel, foreground: colors.blue },
};
const actions = new Map<string, [string, string]>([
  ['Corrected bill', ['Corrected bill', 'ബിൽ തിരുത്തി']],
  ['Recorded payment', ['Recorded payment', 'പണമടവ് രേഖപ്പെടുത്തി']],
  ['Deleted payment', ['Deleted payment', 'പണമടവ് നീക്കി']],
  ['Wrote off dues', ['Wrote off dues', 'കുടിശ്ശിക ഒഴിവാക്കി']],
  ['Added household', ['Added household', 'വീട് ചേർത്തു']],
  ['Updated household', ['Updated household', 'വീട് പുതുക്കി']],
  ['Added periodicals', ['Added periodical', 'പത്രം ചേർത്തു']],
  ['Updated periodicals', ['Updated periodical', 'പത്രം പുതുക്കി']],
  ['Added routes', ['Added route', 'റൂട്ട് ചേർത്തു']],
  ['Updated routes', ['Updated route', 'റൂട്ട് പുതുക്കി']],
  ['Added boys', ['Added delivery person', 'വിതരണക്കാരനെ ചേർത്തു']],
  ['Updated boys', ['Updated delivery person', 'വിതരണക്കാരന്റെ വിവരങ്ങൾ പുതുക്കി']],
]);

export default function ActivityScreen() {
  const state = useRegister();
  const t = useWords();
  const [category, setCategory] = useState<ActivityKind | 'all'>('all');
  const [range, setRange] = useState<ActivityRange>('all');
  const [showRange, setShowRange] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const dateOptions = [
    { value: 'all', label: t('All dates', 'എല്ലാ തീയതികളും') },
    { value: 'today', label: t('Today', 'ഇന്ന്') },
    { value: 'yesterday', label: t('Yesterday', 'ഇന്നലെ') },
    { value: 'week', label: t('Last 7 days', 'കഴിഞ്ഞ 7 ദിവസം') },
    { value: 'month', label: t('Last 30 days', 'കഴിഞ്ഞ 30 ദിവസം') },
  ];
  const when = new Date();
  const today = activityDay(when);
  const yesterday = activityDay(dayBefore(when, 1));
  const locale = state.language === 'ml' ? 'ml-IN' : 'en-IN';
  const billMonths = new Map(state.bills.map(bill => [bill.id, bill.month]));
  const payments = new Set(state.payments.map(payment => payment.id));
  const households = new Set(state.households.map(household => household.id));

  function titleFor(entry: Activity) {
    const count = /^Imported (\d+) households?$/.exec(entry.action)?.[1];
    const labels = actions.get(entry.correction ? 'Corrected bill' : entry.action);
    const action = labels ? t(...labels) : count ? t(entry.action, `${count} വീടുകൾ ഇറക്കുമതി ചെയ്തു`) : entry.action;
    return entry.name ? entry.name + ' · ' + action : action;
  }

  function timeFor(entry: Activity) {
    return new Date(entry.at).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  }

  function correctionMonth(entry: Activity) {
    return entry.correction && billMonths.get(entry.correction.billId);
  }

  function detailFor(entry: Activity) {
    const month = correctionMonth(entry);
    const correction = entry.correction;
    return [timeFor(entry), entry.route, month && monthLabel(month, state.language), correction?.item,
      correction && t('Charge', 'തുക') + ' ' + money(correction.before) + ' → ' + money(correction.after),
    ].filter(Boolean).join(' · ');
  }

  function openEntry(entry: Activity) {
    Keyboard.dismiss();
    if (entry.paymentId && payments.has(entry.paymentId)) {
      router.push({ pathname: '/payment-detail', params: { id: entry.paymentId } });
    } else if (entry.customerId && households.has(entry.customerId)) {
      const month = correctionMonth(entry);
      router.push({ pathname: '/customer', params: { id: entry.customerId, ...(month ? { month } : {}) } });
    } else {
      Alert.alert(titleFor(entry), new Date(entry.at).toLocaleDateString(locale, { dateStyle: 'long' }) + ' · ' + detailFor(entry));
    }
  }

  const normalized = query.trim().normalize('NFC').toLocaleLowerCase();
  const matches = normalized ? state.activity.filter(entry => [
    titleFor(entry), entry.action, detailFor(entry), entry.amount === undefined ? '' : money(entry.amount),
  ].join(' ').normalize('NFC').toLocaleLowerCase().includes(normalized)) : state.activity;
  const sections = groupActivity(matches, category, range, when);

  return <Screen title={t('Recent activity', 'സമീപകാല മാറ്റങ്ങൾ')} back scroll={false} canvas right={
    <View style={styles.actions}>
      <IconButton name={showSearch ? 'close' : 'search'} label={showSearch ? t('Close search', 'തിരച്ചിൽ അടയ്ക്കുക') : t('Search activity', 'പ്രവർത്തനങ്ങൾ തിരയുക')}
        onPress={() => { if (showSearch) { Keyboard.dismiss(); setQuery(''); } setShowSearch(value => !value); }} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('Filter by date', 'തീയതി അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക')}
        onPress={() => { Keyboard.dismiss(); setShowRange(true); }}
        style={({ pressed }) => [styles.filterButton, range !== 'all' && styles.filterActive, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="filter-outline" size={24} color={range === 'all' ? colors.ink : colors.blue} />
      </Pressable>
    </View>}>
    {showSearch && <View style={styles.search}>
      <Icon name="search" size={22} color={colors.muted} />
      <TextInput autoFocus accessibilityLabel={t('Search activity', 'പ്രവർത്തനങ്ങൾ തിരയുക')} placeholder={t('Search name, route or action', 'പേര്, റൂട്ട് അല്ലെങ്കിൽ പ്രവർത്തനം തിരയുക')}
        placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} autoCorrect={false}
        style={[styles.searchInput, state.language === 'ml' && styles.malayalam]} />
      {!!query && <IconButton name="clear" label={t('Clear search', 'തിരച്ചിൽ മായ്ക്കുക')} onPress={() => setQuery('')} />}
    </View>}
    <View style={styles.categories}>
      <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips} accessibilityRole="tablist">
        {([
          ['all', t('All', 'എല്ലാം')],
          ['payments', t('Payments', 'പണമടവുകൾ')],
          ['bills', t('Bills', 'ബില്ലുകൾ')],
          ['households', t('Households', 'വീടുകൾ')],
          ['imports', t('Imports', 'ഇറക്കുമതികൾ')],
        ] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: category === key }}
          onPress={() => setCategory(key)} style={({ pressed }) => [styles.chip, category === key && styles.chipSelected, pressed && styles.pressed]}>
          {key !== 'all' && <MaterialCommunityIcons name={themes[key].icon} size={16} color={category === key ? colors.surface : colors.blue} />}
          <Label variant="secondary" style={category === key ? styles.onBlue : undefined}>{label}</Label>
        </Pressable>)}
      </ScrollView>
      {range !== 'all' && <Label variant="secondary" style={styles.muted}>{dateOptions.find(option => option.value === range)?.label}</Label>}
    </View>
    <SectionList sections={sections} keyExtractor={entry => entry.id} stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
      ListEmptyComponent={<Label style={styles.muted}>{state.activity.length ? t('No matching activity.', 'പൊരുത്തപ്പെടുന്ന പ്രവർത്തനങ്ങളില്ല.') :
        t('No changes recorded yet.', 'മാറ്റങ്ങൾ രേഖപ്പെടുത്തിയിട്ടില്ല.')}</Label>}
      renderSectionHeader={({ section }) => {
        const label = section.day === today ? t('Today', 'ഇന്ന്') : section.day === yesterday ? t('Yesterday', 'ഇന്നലെ') : '';
        return <Label accessibilityRole="header" bold style={styles.sectionHeader}>
          {label && label + ' · '}{section.date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
        </Label>;
      }}
      renderSectionFooter={() => <View style={styles.sectionGap} />}
      renderItem={({ item, index, section }) => {
        const kind = activityKind(item);
        const theme = themes[kind];
        const deleted = item.action === 'Deleted payment';
        return <Pressable accessibilityRole="button" onPress={() => openEntry(item)}
          style={({ pressed }) => [styles.row, index === section.data.length - 1 && styles.last, pressed && styles.pressed]}>
          <View style={[styles.icon, { backgroundColor: deleted ? colors.dueSurface : theme.tint }]}>
            <MaterialCommunityIcons name={theme.icon} size={24} color={deleted ? colors.error : theme.foreground} />
          </View>
          <View style={styles.words}>
            <Label bold>{titleFor(item)}</Label>
            <Label variant="secondary" style={styles.secondary}>{detailFor(item)}</Label>
            {kind !== 'payments' && item.amount !== undefined && <Label variant="secondary">{money(item.amount)}</Label>}
          </View>
          {kind === 'payments' && item.amount !== undefined && <Label bold variant="secondary" style={[styles.amount,
            deleted ? styles.amountDeleted : styles.amountCollected]}>{deleted ? '−' : '+'}{money(item.amount)}</Label>}
          <Icon name="chevron-right" size={18} />
        </Pressable>;
      }} />
    {showRange && <Choice title={t('Filter by date', 'തീയതി അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക')} options={dateOptions}
      onChoose={value => setRange(value as ActivityRange)} onDismiss={() => setShowRange(false)} />}
  </Screen>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center' },
  filterButton: { width: sizes.touch, minHeight: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  filterActive: { backgroundColor: colors.selected, borderRadius: sizes.panelRadius },
  search: { minHeight: sizes.touch, marginBottom: spacing.sm, paddingLeft: spacing.md, gap: spacing.sm,
    flexDirection: 'row', alignItems: 'center', borderRadius: sizes.panelRadius, borderWidth: 1,
    borderColor: colors.divider, backgroundColor: colors.surface },
  searchInput: { flex: 1, color: colors.ink, fontSize: sizes.body, minHeight: sizes.touch - 2 },
  malayalam: { fontFamily: 'Malayalam' },
  categories: { marginBottom: spacing.lg, gap: spacing.sm },
  chips: { flexDirection: 'row', gap: 2 },
  chip: { minHeight: sizes.touch, minWidth: sizes.touch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    paddingHorizontal: 3, borderRadius: spacing.xl, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.divider },
  chipSelected: { borderColor: colors.navigationActive, backgroundColor: colors.navigationActive },
  onBlue: { color: colors.surface },
  muted: { color: colors.muted },
  list: { paddingBottom: spacing.lg },
  sectionHeader: { color: colors.darkBlue, backgroundColor: colors.panel, borderTopLeftRadius: sizes.radius, borderTopRightRadius: sizes.radius,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, overflow: 'hidden' },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderColor: colors.softBorder, borderBottomWidth: StyleSheet.hairlineWidth, borderLeftWidth: 1, borderRightWidth: 1, backgroundColor: colors.surface },
  last: { borderBottomLeftRadius: sizes.radius, borderBottomRightRadius: sizes.radius, borderBottomWidth: 1 },
  icon: { width: 38, height: 38, borderRadius: sizes.radius, alignItems: 'center', justifyContent: 'center' },
  words: { flex: 1, gap: spacing.xs },
  secondary: { color: colors.navigationInk },
  amount: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, textAlign: 'right', maxWidth: '34%', borderRadius: sizes.radius, overflow: 'hidden' },
  amountCollected: { color: colors.paid, backgroundColor: colors.paidSurface },
  amountDeleted: { color: colors.error, backgroundColor: colors.dueSurface },
  sectionGap: { height: spacing.md },
  pressed: { opacity: 0.7 },
});
