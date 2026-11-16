import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { changeRegister, newId, useRegister } from '../src/data/store';
import { currentProfile, monthKey, parseMoney, profileAt, type Subscription } from '../src/domain/model';
import { saveHousehold } from '../src/domain/households';
import { Button, Choice, ErrorText, Field, Icon, Label, MonthPicker, Row, Screen, useWords } from '../src/components/ui';
export default function HouseholdScreen() {
  const state = useRegister(); const t = useWords(); const params = useLocalSearchParams<{ id?: string; routeId?: string }>();
  const existing = state.households.find(h => h.id === params.id); const previous = existing && currentProfile(existing);
  const customerId = useRef(params.id ?? newId()).current;
  const [name, setName] = useState(previous?.name ?? ''); const [phone, setPhone] = useState(existing?.phone ?? '');
  const [routeId, setRoute] = useState(previous?.routeId ?? params.routeId ?? ''); const [boyId, setBoy] = useState(previous?.boyId ?? '');
  const [month, setMonth] = useState(monthKey(new Date())); const [active, setActive] = useState(previous?.active ?? true);
  const initialAfter = state.households.filter(h => h.id !== customerId).map(h => ({ id: h.id, p: currentProfile(h) })).filter(h => h.p.routeId === previous?.routeId && h.p.position < (previous?.position ?? 1)).sort((a, b) => b.p.position - a.p.position)[0]?.id ?? '';
  const [afterId, setAfter] = useState(initialAfter); const [subscriptions, setSubscriptions] = useState<Subscription[]>(previous?.subscriptions ?? []);
  const [special, setSpecial] = useState<Record<string, string>>(() => Object.fromEntries((previous?.subscriptions ?? []).map(s => [s.periodicalId, s.specialRate === undefined ? '' : String(s.specialRate / 100)])));
  const [choice, setChoice] = useState<'route' | 'boy' | 'after'>(); const [details, setDetails] = useState(false); const [busy, setBusy] = useState(false); const saving = useRef(false); const [error, setError] = useState('');
  const stops = state.households.filter(h => h.id !== customerId).map(h => ({ id: h.id, p: profileAt(h, month) })).filter(h => h.p?.routeId === routeId).sort((a, b) => a.p!.position - b.p!.position);
  const options = choice === 'route' ? state.routes.map(r => ({ value: r.id, label: r.name })) : choice === 'boy' ? state.boys.map(b => ({ value: b.id, label: b.name })) : [{ value: '', label: t('First stop', 'ആദ്യ സ്ഥാനം') }, ...stops.map(h => ({ value: h.id, label: h.p!.position + '. ' + h.p!.name }))];
  async function save() { if (saving.current) return; saving.current = true; setBusy(true); setError('');
    try { const subs = subscriptions.map(s => ({ ...s, specialRate: special[s.periodicalId]?.trim() ? parseMoney(special[s.periodicalId]) : undefined,
      specialSince: special[s.periodicalId]?.trim() ? (previous?.subscriptions.find(p => p.periodicalId === s.periodicalId && p.specialRate === parseMoney(special[s.periodicalId]))?.specialSince ?? month) : undefined }));
      await changeRegister(d => saveHousehold(d, { id: customerId, phone, afterId, profile: { month, name, routeId, boyId, position: 1, active, subscriptions: subs } }),
        { action: existing ? 'Updated household' : 'Added household', customerId, name, route: state.routes.find(r => r.id === routeId)?.name }); router.back();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); saving.current = false; }
  }
  return <Screen title={existing ? t('Edit household', 'വീട് തിരുത്തുക') : t('Add household', 'വീട് ചേർക്കുക')} back footer={<Button title={t('Save changes', 'മാറ്റങ്ങൾ സൂക്ഷിക്കുക')} onPress={save} busy={busy} />}>
    <Field label={t('Name', 'പേര്')} value={name} onChangeText={setName} />
    <Row title={t('Route', 'റൂട്ട്')} detail={state.routes.find(r => r.id === routeId)?.name ?? t('Choose', 'തിരഞ്ഞെടുക്കുക')} onPress={() => setChoice('route')} />
    <Row title={t('Delivery boy', 'വിതരണക്കാരൻ')} detail={state.boys.find(b => b.id === boyId)?.name ?? t('Choose', 'തിരഞ്ഞെടുക്കുക')} onPress={() => setChoice('boy')} />
    <Row title={t('Position', 'സ്ഥാനം')} detail={afterId ? t('After ', 'ശേഷം ') + stops.find(s => s.id === afterId)?.p?.name : t('First stop', 'ആദ്യ സ്ഥാനം')} onPress={() => setChoice('after')} />
    <Label>{t('Papers', 'പത്രങ്ങൾ')}</Label>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>{state.periodicals.map(p => { const selected = subscriptions.some(s => s.periodicalId === p.id); return <Pressable key={p.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setSubscriptions(list => selected ? list.filter(s => s.periodicalId !== p.id) : [...list, { periodicalId: p.id, quantity: 1 }])} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 48 }}>
      <Icon name={selected ? 'check-box' : 'check-box-outline-blank'} /><Label bold>{p.code}</Label></Pressable>; })}</View>
    <Row title={t('More details', 'കൂടുതൽ വിവരങ്ങൾ')} onPress={() => setDetails(!details)} />
    {details && <><Field label={t('Phone (optional)', 'ഫോൺ (ഐച്ഛികം)')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Label>{t('Changes apply from', 'മാറ്റങ്ങൾ ബാധകമാകുന്ന മാസം')}</Label><MonthPicker value={month} onChange={setMonth} />
      <Label variant="secondary">{t('Prepared bills stay unchanged. Correct an existing bill from its customer screen.', 'തയ്യാറാക്കിയ ബില്ലുകൾ മാറില്ല. നിലവിലെ ബിൽ ഉപഭോക്താവിന്റെ സ്ക്രീനിൽ തിരുത്താം.')}</Label>
      <Row title={t('Deliver from this month', 'ഈ മാസം മുതൽ വിതരണം')} right={active ? t('Yes', 'അതെ') : t('Stopped', 'നിർത്തി')} onPress={() => setActive(!active)} />
      {subscriptions.map(sub => <View key={sub.periodicalId} style={{ gap: 8 }}><Label bold>{state.periodicals.find(p => p.id === sub.periodicalId)?.code}</Label>
        <Row title={t('Copies', 'കോപ്പികൾ')} right={String(sub.quantity)} />
        <View style={{ flexDirection: 'row', gap: 16 }}><Button secondary title="−" disabled={sub.quantity <= 1} onPress={() => setSubscriptions(list => list.map(s => s.periodicalId === sub.periodicalId ? { ...s, quantity: s.quantity - 1 } : s))} />
          <Button secondary title="+" disabled={sub.quantity >= 100} onPress={() => setSubscriptions(list => list.map(s => s.periodicalId === sub.periodicalId ? { ...s, quantity: s.quantity + 1 } : s))} /></View>
        <Field label={t('Special monthly price per copy (optional)', 'പ്രത്യേക മാസവില (ഐച്ഛികം)')} value={special[sub.periodicalId] ?? ''} onChangeText={v => setSpecial(d => ({ ...d, [sub.periodicalId]: v }))} keyboardType="decimal-pad" />
      </View>)}</>}
    {!state.routes.length || !state.boys.length || !state.periodicals.length ? <Label>{t('Add routes, delivery boys and periodicals in Manage first.', 'ആദ്യം ക്രമീകരണത്തിൽ റൂട്ടുകൾ, വിതരണക്കാർ, പത്രങ്ങൾ എന്നിവ ചേർക്കുക.')}</Label> : null}
    <ErrorText message={error} />
    {choice && <Choice title={t('Choose', 'തിരഞ്ഞെടുക്കുക')} options={options} onChoose={v => { if (choice === 'route') { setRoute(v); setAfter(''); } else if (choice === 'boy') setBoy(v); else setAfter(v); }} onDismiss={() => setChoice(undefined)} />}
  </Screen>;
}
