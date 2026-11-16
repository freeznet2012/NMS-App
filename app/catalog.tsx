import React, { useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { changeRegister, newId, useRegister } from '../src/data/store';
import { money, monthKey, parseMoney } from '../src/domain/model';
import { Button, ErrorText, Field, Label, MonthPicker, Row, Screen, useWords } from '../src/components/ui';
const findRate = (rates: { month: string; amount: number }[], month: string) => [...rates].sort((a, b) => b.month.localeCompare(a.month)).find(r => r.month <= month)?.amount ?? 0;
export default function CatalogScreen() {
  const state = useRegister(); const t = useWords(); const params = useLocalSearchParams<{ kind?: string }>();
  const kind = params.kind === 'routes' ? 'routes' : params.kind === 'boys' ? 'boys' : 'periodicals';
  const [editing, setEditing] = useState<string>(); const [name, setName] = useState(''); const [code, setCode] = useState(''); const [price, setPrice] = useState('');
  const [month, setMonth] = useState(monthKey(new Date())); const [busy, setBusy] = useState(false); const saving = useRef(false); const [error, setError] = useState('');
  async function save() {
    if (saving.current) return; saving.current = true; setBusy(true); setError('');
    try { if (!name.trim()) throw new Error(t('Enter a name', 'പേര് നൽകുക'));
      const amount = kind === 'periodicals' ? parseMoney(price) : 0;
      await changeRegister(d => {
        if (kind === 'periodicals') {
          const normalized = code.trim().toUpperCase();
          if (!normalized || d.periodicals.some(p => p.code === normalized && p.id !== editing)) throw new Error(t('Use a unique paper code', 'വ്യത്യസ്ത പത്ര കോഡ് നൽകുക'));
          const paper = d.periodicals.find(p => p.id === editing);
          if (paper) { paper.name = name.trim(); paper.code = normalized;
            if (findRate(paper.rates, month) !== amount) paper.rates = [...paper.rates.filter(r => r.month !== month), { month, amount }]; }
          else d.periodicals.push({ id: newId(), name: name.trim(), code: normalized, rates: [{ month, amount }] });
        } else {
          if (d[kind].some(r => r.id !== editing && r.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) throw new Error(t('That name already exists', 'ഈ പേര് നിലവിലുണ്ട്'));
          const record = d[kind].find(r => r.id === editing); if (record) record.name = name.trim(); else d[kind].push({ id: newId(), name: name.trim() });
        }
      }, { action: (editing ? 'Updated ' : 'Added ') + kind, name }); setEditing(undefined); setName(''); setCode(''); setPrice('');
    } catch (e) { setError((e as Error).message); } finally { saving.current = false; setBusy(false); }
  }
  return <Screen title={kind === 'routes' ? t('Routes', 'റൂട്ടുകൾ') : kind === 'boys' ? t('Delivery boys', 'വിതരണക്കാർ') : t('Periodicals', 'പത്രങ്ങൾ')} back>
    {state[kind].map(record => <Row key={record.id} title={record.name} detail={'code' in record ? record.code + ' · ' + money([...record.rates].sort((a, b) => b.month.localeCompare(a.month))[0].amount) : undefined}
      onPress={() => { setEditing(record.id); setName(record.name); setError(''); if ('code' in record) { setCode(record.code); setPrice(String(findRate(record.rates, month) / 100)); } }} />)}
    <Label variant="title" bold>{editing ? t('Edit', 'തിരുത്തുക') : t('Add new', 'പുതിയത് ചേർക്കുക')}</Label>
    <Field label={t('Name', 'പേര്')} value={name} onChangeText={setName} />
    {kind === 'periodicals' && <><Field label={t('Short code', 'ചുരുക്ക കോഡ്')} value={code} onChangeText={setCode} autoCapitalize="characters" />
      <Field label={t('Monthly price (₹)', 'മാസവില (₹)')} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <Label>{t('Price applies from', 'വില ബാധകമാകുന്ന മാസം')}</Label><MonthPicker value={month} onChange={setMonth} />
      <Label variant="secondary">{t('A changed usual price replaces special prices from this month. Existing bills keep their saved prices.', 'സാധാരണ വില മാറിയാൽ ഈ മാസം മുതൽ പ്രത്യേക വിലകൾ ഒഴിവാകും. നിലവിലെ ബില്ലുകൾ മാറില്ല.')}</Label></>}
    <ErrorText message={error} /><Button title={t('Save', 'സൂക്ഷിക്കുക')} busy={busy} onPress={save} />
    {editing && <Button secondary title={t('Cancel edit', 'തിരുത്തൽ റദ്ദാക്കുക')} onPress={() => { setEditing(undefined); setName(''); setCode(''); setPrice(''); }} />}
  </Screen>;
}
