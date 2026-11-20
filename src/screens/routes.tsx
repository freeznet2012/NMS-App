import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { changeRegister, newId, useRegister } from '../data/store';
import { prepareMonth } from '../domain/billing';
import { collectionRows, summarizeCollections } from '../domain/collection';
import { lastCompletedMonth, money, monthKey, validMonth } from '../domain/model';
import { ErrorText, Icon, Label, Screen, useWords } from '../components/ui';
import { MonthPicker } from '../components/month-picker';
import { colors, sizes, spacing } from '../theme';

export function RoutesScreen() {
  const state = useRegister(); const t = useWords(); const params = useLocalSearchParams<{ month?: string }>();
  const [month, setMonth] = useState(params.month && validMonth(params.month) ? params.month : lastCompletedMonth());
  const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let live = true; setBusy(true); setError('');
    changeRegister(d => prepareMonth(d, month, newId)).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; }; }, [month]);
  const { byRoute, total } = useMemo(() => summarizeCollections(collectionRows(state, month), state.routes), [state, month]);
  return <Screen title={t('Routes', 'റൂട്ടുകൾ')} titleVariant="pageTitle" tabs="routes" canvas scroll={false}>
    <FlatList data={busy || error ? [] : state.routes} keyExtractor={route => route.id}
      contentContainerStyle={overviewStyles.list}
      ListHeaderComponent={<View style={overviewStyles.header}>
        <MonthPicker value={month} maxMonth={monthKey(new Date())} onChange={setMonth} />
        {busy ? <ActivityIndicator color={colors.blue} /> : error ? <ErrorText message={error} /> :
          <View style={overviewStyles.summary}>
            <View style={overviewStyles.metric}>
              <MaterialCommunityIcons name="database-outline" color={colors.blue} size={sizes.icon} />
              <View style={overviewStyles.metricText}>
                <Label variant="title" bold style={overviewStyles.metricAmount}>{money(total.outstanding)}</Label>
                <Label variant="secondary">{t('Total Outstanding', 'ആകെ കുടിശ്ശിക')}</Label>
              </View>
            </View>
            <View style={overviewStyles.summaryDivider} />
            <View style={overviewStyles.metric}>
              <MaterialCommunityIcons name="receipt-text-outline" color={colors.blue} size={sizes.icon} />
              <View style={overviewStyles.metricText}>
                <Label variant="title" bold style={overviewStyles.metricAmount}>{total.unpaid}</Label>
                <Label variant="secondary">{t('Unpaid Bills', 'അടയ്ക്കാത്ത ബില്ലുകൾ')}</Label>
              </View>
            </View>
          </View>}
      </View>}
      ListEmptyComponent={!busy && !error ? <Label>{t('Import a route from Manage to begin.', 'തുടങ്ങാൻ ക്രമീകരണത്തിൽ നിന്ന് ഒരു റൂട്ട് ചേർക്കുക.')}</Label> : null}
      renderItem={({ item }) => {
        const summary = byRoute.get(item.id);
        const unpaid = summary?.unpaid ?? 0;
        return <Pressable accessibilityRole="button" style={({ pressed }) => [overviewStyles.card, pressed && overviewStyles.pressed]}
          onPress={() => router.push({ pathname: '/route', params: { id: item.id, month } })}>
          <View style={overviewStyles.cardText}>
            <Label variant="headline" bold>{item.name}</Label>
            <View style={overviewStyles.cardStatus}>
              <View style={[overviewStyles.dot, !unpaid && { backgroundColor: colors.muted }]} />
              <Label variant="secondary" style={{ flexShrink: 1 }}>{unpaid} {t('unpaid', 'കുടിശ്ശിക')}</Label>
            </View>
          </View>
          <View style={overviewStyles.amountChip}><Label variant="headline" bold>{money(summary?.outstanding ?? 0)}</Label></View>
          <Icon name="chevron-right" />
        </Pressable>;
      }} />
  </Screen>;
}

const overviewStyles = StyleSheet.create({
  list: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  header: { gap: spacing.lg, paddingBottom: spacing.xs },
  summary: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md,
    backgroundColor: colors.panel, borderRadius: sizes.panelRadius },
  metric: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricText: { flex: 1 },
  metricAmount: { color: colors.darkBlue },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: spacing.xxl, backgroundColor: colors.divider },
  card: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
    paddingLeft: spacing.lg, paddingRight: spacing.md, gap: spacing.sm, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.softBorder, borderRadius: sizes.panelRadius },
  cardText: { flex: 1 },
  cardStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  amountChip: { backgroundColor: colors.panel, borderRadius: sizes.panelRadius, paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, flexShrink: 1 },
  pressed: { opacity: 0.65 },
});
