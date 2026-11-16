import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { changeRegister, newId, useRegister } from '../data/store';
import { prepareMonth } from '../domain/billing';
import { collectionRows, filterCollection } from '../domain/collection';
import { lastCompletedMonth, money, monthLabel, validMonth } from '../domain/model';
import { Choice, ErrorText, Field, IconButton, Label, MonthPicker, Row, Screen, useWords } from '../components/ui';
import { colors } from '../theme';

export function RoutesScreen() {
  const state = useRegister(); const t = useWords(); const params = useLocalSearchParams<{ month?: string }>();
  const [month, setMonth] = useState(params.month && validMonth(params.month) ? params.month : lastCompletedMonth());
  const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let live = true; setBusy(true); setError('');
    changeRegister(d => prepareMonth(d, month, newId)).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; }; }, [month]);
  const rows = useMemo(() => collectionRows(state, month), [state, month]);
  return <Screen title={t('Routes', 'റൂട്ടുകൾ')} tabs="routes" scroll={false}>
    <MonthPicker value={month} onChange={setMonth} /><ErrorText message={error} />
    {busy ? <ActivityIndicator /> : <FlatList data={state.routes} keyExtractor={r => r.id}
      ListEmptyComponent={<Label>{t('Import a route from Manage to begin.', 'തുടങ്ങാൻ ക്രമീകരണത്തിൽ നിന്ന് ഒരു റൂട്ട് ചേർക്കുക.')}</Label>}
      renderItem={({ item }) => { const unpaid = rows.filter(r => r.profile.routeId === item.id && r.remaining > 0); return <Row title={item.name}
        detail={unpaid.length + ' ' + t('unpaid', 'കുടിശ്ശിക')} right={money(unpaid.reduce((sum, r) => sum + r.remaining, 0))}
        onPress={() => router.push({ pathname: '/route', params: { id: item.id, month } })} />; }} />}
  </Screen>;
}
export function RouteScreen() {
  const state = useRegister(); const t = useWords(); const { id, month = lastCompletedMonth() } = useLocalSearchParams<{ id: string; month: string }>();
  const [status, setStatus] = useState('unpaid'); const [query, setQuery] = useState(''); const [boy, setBoy] = useState(''); const [chooseBoy, setChooseBoy] = useState(false);
  const [menu, setMenu] = useState(false);
  const rows = useMemo(() => filterCollection(collectionRows(state, month), { routeId: id, boyId: boy, query, status }), [state, month, id, boy, query, status]);
  return <Screen title={<>{state.routes.find(r => r.id === id)?.name ?? t('Route', 'റൂട്ട്')} <Label variant="secondary">· {monthLabel(month, state.language)}</Label></>} back scroll={false}
    right={<IconButton name="more-vert" label={t('More actions', 'കൂടുതൽ പ്രവർത്തനങ്ങൾ')} onPress={() => setMenu(true)} />}>
    <View style={{ flexDirection: 'row' }}>{['unpaid', 'paid', 'all'].map((value, i) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: status === value }}
      onPress={() => setStatus(value)} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: status === value ? colors.selected : colors.surface }}>
      <Label bold>{[t('Unpaid', 'കുടിശ്ശിക'), t('Paid', 'അടച്ചത്'), t('All', 'എല്ലാം')][i]}</Label></Pressable>)}</View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Field label={t('Search households', 'വീടുകൾ തിരയുക')} value={query} onChangeText={setQuery} /></View>
      <Pressable accessibilityRole="button" onPress={() => setChooseBoy(true)} style={{ minHeight: 48, justifyContent: 'center' }}><Label>{state.boys.find(b => b.id === boy)?.name ?? t('All boys', 'എല്ലാവരും')} ▾</Label></Pressable></View>
    <FlatList data={rows} keyExtractor={r => r.household.id} keyboardShouldPersistTaps="handled"
      ListEmptyComponent={<Label>{t('No matching households', 'വീടുകൾ കണ്ടെത്തിയില്ല')}</Label>}
      renderItem={({ item }) => <Row dense title={item.profile.position + '. ' + item.profile.name}
        detail={item.bill?.lines.map(l => l.code + (l.quantity > 1 ? ' ×' + l.quantity : '')).join(', ')} right={money(item.remaining)}
        onPress={() => router.push({ pathname: '/customer', params: { id: item.household.id, month } })} />} />
    {chooseBoy && <Choice title={t('Delivery boy', 'വിതരണക്കാരൻ')} options={[{ value: '', label: t('All boys', 'എല്ലാവരും') }, ...state.boys.map(b => ({ value: b.id, label: b.name }))]} onChoose={setBoy} onDismiss={() => setChooseBoy(false)} />}
    {menu && <Choice title={t('Route actions', 'റൂട്ട് പ്രവർത്തനങ്ങൾ')} options={[{ value: 'add', label: t('Add customer', 'ഉപഭോക്താവിനെ ചേർക്കുക') }]} onChoose={() => router.push({ pathname: '/household', params: { routeId: id } })} onDismiss={() => setMenu(false)} />}
  </Screen>;
}
