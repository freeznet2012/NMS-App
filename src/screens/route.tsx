import React, { useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Choice, Icon, IconButton, Label, RoadIcon, Screen, useWords } from '../components/ui';
import { useRegister } from '../data/store';
import { collectionRows, filterCollection, summarizeRouteCollection, type CollectionStatus } from '../domain/collection';
import { lastCompletedMonth, money, monthLabel } from '../domain/model';
import { colors, sizes, spacing } from '../theme';

const statuses = ['unpaid', 'paid', 'all'] as const;
const paidPreviewLength = 4;

export function RouteScreen() {
  const state = useRegister();
  const t = useWords();
  const { id, month = lastCompletedMonth() } = useLocalSearchParams<{ id: string; month: string }>();
  const { width, fontScale } = useWindowDimensions();
  const compact = width / Math.max(1, fontScale) < 355;
  const [status, setStatus] = useState<CollectionStatus>('unpaid');
  const [query, setQuery] = useState('');
  const [boy, setBoy] = useState('');
  const [chooseBoy, setChooseBoy] = useState(false);
  const [showAllPaid, setShowAllPaid] = useState(false);
  const searching = !!query.trim();
  const active = searching ? 'all' : status;
  const billed = useMemo(() => collectionRows(state, month), [state, month]);
  const scope = useMemo(() => filterCollection(billed, {
    routeId: id, boyId: boy, status: 'all', query: '',
  }), [billed, id, boy]);
  const { counts, amounts } = useMemo(() => summarizeRouteCollection(scope), [scope]);
  const results = filterCollection(scope, { routeId: id, boyId: boy, query, status });
  const canExpand = active === 'paid' && results.length > paidPreviewLength;
  const rows = canExpand && !showAllPaid ? results.slice(0, paidPreviewLength) : results;
  const routeName = state.routes.find(route => route.id === id)?.name ?? t('Route', 'റൂട്ട്');
  const addLabel = t('Add customer', 'ഉപഭോക്താവിനെ ചേർക്കുക');
  const showAddLabel = !compact && state.language === 'en';
  const searchLabel = t('Search households', 'വീടുകൾ തിരയുക');
  const allBoys = t('All delivery boys', 'എല്ലാ വിതരണക്കാരും');
  const boyName = state.boys.find(entry => entry.id === boy)?.name;
  const statusLabels = { unpaid: t('Unpaid', 'കുടിശ്ശിക'), paid: t('Paid', 'അടച്ചത്'), all: t('All', 'എല്ലാം') };
  const amountLabels = { unpaid: t('outstanding', 'കുടിശ്ശിക'), paid: t('collected', 'ലഭിച്ചത്'), all: t('total', 'ആകെ') };
  const countLabels = { unpaid: t('unpaid', 'കുടിശ്ശിക'), paid: t('paid', 'അടച്ചത്'), all: t('customers', 'വീടുകൾ') };
  const countLabel = (count: number) => active === 'all' && count === 1 ? t('customer', 'വീട്') : countLabels[active];
  const amountColor = { unpaid: colors.error, paid: colors.paid, all: colors.darkBlue }[active];
  const footerLabel = showAllPaid
    ? t('Show fewer paid customers', 'കുറച്ച് പേരെ കാണുക')
    : t(`Show all ${results.length} paid customers`, `അടച്ച ${results.length} പേരെയും കാണുക`);

  return <Screen scroll={false}>
    <View style={styles.pageHeader}>
      <IconButton name="arrow-back" label={t('Back', 'തിരികെ')}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/routes')} />
      <View style={styles.routeIcon}><RoadIcon color={colors.navigationActive} /></View>
      <View style={styles.identity}>
        <Label variant="headline" bold accessibilityRole="header">{routeName}</Label>
        <View style={styles.month}>
          <Icon name="calendar-today" size={16} color={colors.navigationInk} />
          <Label variant="secondary" style={styles.monthText}>{monthLabel(month, state.language)}</Label>
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={addLabel}
        onPress={() => { Keyboard.dismiss(); router.push({ pathname: '/household', params: { routeId: id } }); }}
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
        <Icon name="person-add-alt" color={colors.navigationActive} size={22} />
        {showAddLabel && <Label variant="secondary" bold style={styles.blueText}>{addLabel}</Label>}
      </Pressable>
    </View>
    <FlatList data={rows} keyExtractor={row => row.household.id} keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      ListHeaderComponent={<View style={styles.controls}>
        <View style={[styles.summary, active === 'paid' && styles.paidSummary]}>
          <Label variant="secondary" style={styles.metric}>
            <Label variant="headline" bold style={{ color: amountColor }}>{money(amounts[active])}</Label>{' '}{amountLabels[active]}
          </Label>
          <View style={styles.summaryDivider} />
          <Label variant="secondary" style={styles.metric}>
            <Label variant="headline" bold>{counts[active]}</Label>{' '}{countLabel(counts[active])}
          </Label>
        </View>
        <View style={styles.statuses} accessibilityRole="tablist">
          {statuses.map((value, index) => {
            const selected = active === value;
            const label = `${statusLabels[value]} (${counts[value]})`;
            return <Pressable key={value} accessibilityRole="tab" accessibilityLabel={label}
              accessibilityState={{ selected, disabled: searching }} disabled={searching}
              onPress={() => { Keyboard.dismiss(); setStatus(value); setShowAllPaid(false); }}
              style={({ pressed }) => [styles.status, index > 0 && styles.statusDivider, selected && styles.activeStatus, pressed && styles.pressed]}>
              <Label variant="secondary" bold style={[styles.statusText, selected && styles.activeStatusText]}>{label}</Label>
            </Pressable>;
          })}
        </View>
        <View style={styles.search}>
          <View style={styles.searchIcon}><Icon name="search" color={colors.muted} /></View>
          <TextInput accessibilityLabel={searchLabel} placeholder={compact ? t('Search', 'തിരയുക') : searchLabel}
            placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} returnKeyType="search"
            autoCapitalize="none" autoCorrect={false}
            style={[styles.searchInput, state.language === 'ml' && styles.malayalamInput]} />
          {query.length > 0 && <IconButton name="close" label={t('Clear search', 'തിരച്ചിൽ മായ്ക്കുക')} onPress={() => setQuery('')} />}
        </View>
        <View style={[styles.scope, compact && styles.stackedScope]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Delivery boy filter', 'വിതരണക്കാരന്റെ ഫിൽട്ടർ') + ', ' + (boyName ?? allBoys)}
            onPress={() => { Keyboard.dismiss(); setChooseBoy(true); }}
            style={({ pressed }) => [styles.boyFilter, boyName && styles.activeBoy, pressed && styles.pressed]}>
            <Icon name="directions-bike" color={colors.navigationActive} size={22} />
            <Label variant="secondary" bold style={styles.boyLabel}>{boyName ?? allBoys}</Label>
            <Icon name="keyboard-arrow-down" size={20} color={colors.darkBlue} />
          </Pressable>
          <Label variant="secondary" accessibilityLiveRegion="polite" style={[styles.resultCount, compact && styles.stackedCount]}>
            {results.length} {countLabel(results.length)}{active !== 'all' ? ' · ' + money(amounts[active]) : ''}
          </Label>
        </View>
      </View>}
      ListEmptyComponent={<Label style={styles.empty}>{t('No matching households', 'വീടുകൾ കണ്ടെത്തിയില്ല')}</Label>}
      ListFooterComponent={canExpand ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAllPaid }}
        onPress={() => setShowAllPaid(value => !value)} style={({ pressed }) => [styles.expand, pressed && styles.pressed]}>
        <Label variant="secondary" bold style={styles.expandText}>{footerLabel}</Label>
        <Icon name={showAllPaid ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} color={colors.blue} size={20} />
      </Pressable> : null}
      renderItem={({ item }) => {
        const unpaid = item.remaining > 0;
        const amount = active === 'all' ? item.original : unpaid ? item.remaining : item.collected;
        const disposition = statusLabels[unpaid ? 'unpaid' : 'paid'];
        const name = item.profile.name;
        return <Pressable accessibilityRole="button"
          accessibilityLabel={[t('Stop', 'സ്ഥാനം') + ' ' + item.profile.position, name, money(amount), disposition].join(', ')}
          style={({ pressed }) => [styles.household, pressed && styles.pressed]}
          onPress={() => { Keyboard.dismiss(); router.push({ pathname: '/customer', params: { id: item.household.id, month } }); }}>
          <View style={styles.stop}><Label variant="secondary" bold style={styles.stopText}>{String(item.profile.position).padStart(2, '0')}</Label></View>
          <View style={[styles.rowContent, compact && styles.stackedRowContent]}>
            <Label bold style={styles.customerName}>{name}</Label>
            <View style={styles.rowValues}>
              <Label bold style={active === 'unpaid' ? styles.dueAmount : styles.amount}>{money(amount)}</Label>
              {active !== 'unpaid' && <View style={[styles.badge, unpaid ? styles.unpaidBadge : styles.paidBadge]}>
                <Icon name={unpaid ? 'schedule' : 'check'} size={15} color={unpaid ? colors.warning : colors.paid} />
                <Label variant="secondary" bold style={[styles.badgeText, { color: unpaid ? colors.warning : colors.paid }]}>{disposition}</Label>
              </View>}
            </View>
          </View>
          <Icon name="chevron-right" size={22} />
        </Pressable>;
      }} />
    {chooseBoy && <Choice title={t('Delivery boy', 'വിതരണക്കാരൻ')}
      options={[{ value: '', label: allBoys }, ...state.boys.map(entry => ({ value: entry.id, label: entry.name }))]}
      onChoose={value => { setBoy(value); setShowAllPaid(false); }} onDismiss={() => setChooseBoy(false)} />}
  </Screen>;
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, marginLeft: -spacing.md },
  routeIcon: { width: 40, height: 40, borderRadius: sizes.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.selected },
  identity: { flex: 1, gap: spacing.xs },
  month: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  monthText: { flex: 1, color: colors.navigationInk },
  add: {
    minHeight: sizes.touch, minWidth: sizes.touch, maxWidth: '43%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderColor: colors.navigationActive, borderRadius: sizes.radius, borderWidth: 1,
  },
  blueText: { color: colors.blue, flexShrink: 1 },
  list: { paddingBottom: spacing.xl },
  controls: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.softBorder },
  summary: { flexDirection: 'row', alignItems: 'center', minHeight: 40, gap: spacing.sm, padding: spacing.sm, borderRadius: sizes.panelRadius, backgroundColor: colors.panel },
  paidSummary: { backgroundColor: colors.paidSurface },
  metric: { flex: 1, textAlign: 'center' },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: 16, backgroundColor: colors.divider },
  statuses: { flexDirection: 'row', backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.softBorder, borderRadius: sizes.radius },
  status: { flex: 1, minHeight: sizes.touch, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  statusDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: colors.divider },
  activeStatus: { borderRadius: sizes.radius, backgroundColor: colors.navigationActive, borderLeftColor: 'transparent' },
  statusText: { textAlign: 'center' },
  activeStatusText: { color: colors.surface },
  search: { flexDirection: 'row', alignItems: 'center', minHeight: sizes.touch, borderWidth: 1, borderColor: colors.divider, borderRadius: sizes.radius, backgroundColor: colors.canvas },
  searchIcon: { paddingHorizontal: spacing.md },
  searchInput: { flex: 1, minHeight: sizes.touch - 2, paddingVertical: spacing.sm, paddingRight: spacing.sm, fontSize: sizes.body, color: colors.ink },
  malayalamInput: { fontFamily: 'Malayalam' },
  scope: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  stackedScope: { flexDirection: 'column', alignItems: 'stretch' },
  boyFilter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: sizes.touch, flexShrink: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: sizes.radius, backgroundColor: colors.selected },
  activeBoy: { borderWidth: 1, borderColor: colors.blue },
  boyLabel: { flexShrink: 1 },
  resultCount: { flexShrink: 1, textAlign: 'right', color: colors.muted },
  stackedCount: { textAlign: 'left' },
  empty: { paddingVertical: spacing.md, color: colors.muted },
  household: { minHeight: 52, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.softBorder, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stop: { minWidth: 36, minHeight: 32, paddingHorizontal: spacing.xs, alignItems: 'center', justifyContent: 'center', borderRadius: sizes.radius, backgroundColor: colors.secondary },
  stopText: { color: colors.muted },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stackedRowContent: { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.xs },
  customerName: { flexShrink: 1, flexGrow: 1 },
  rowValues: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  dueAmount: { color: colors.error, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: sizes.radius, backgroundColor: colors.dueSurface },
  amount: { flexShrink: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, borderRadius: sizes.radius, flexShrink: 1 },
  paidBadge: { backgroundColor: colors.paidSurface },
  unpaidBadge: { backgroundColor: colors.warningSurface },
  badgeText: { flexShrink: 1 },
  expand: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.sm },
  expandText: { color: colors.blue, textAlign: 'center', flexShrink: 1 },
  pressed: { opacity: 0.65 },
});
