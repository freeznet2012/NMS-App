import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useRegister } from '../data/store';
import { commitImport, readWorkbook, templateFile, type ImportPreview } from '../data/workbook';
import { Button, ErrorText, Icon, Label, MonthPicker, Row, Screen, useWords } from '../components/ui';
import { money } from '../domain/model';

export function ImportScreen() {
  const state = useRegister(); const t = useWords();
  const [month, setMonth] = useState(state.firstMonth);
  const [uri, setUri] = useState(''); const [preview, setPreview] = useState<ImportPreview>();
  const [review, setReview] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function run(task: () => Promise<void>) { if (busy) return; setBusy(true); setError(''); try { await task(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  const selected = preview?.rows.filter(r => r.include) ?? [];
  const flagged = preview?.rows.filter(r => r.errors.length || r.possibleDuplicate) ?? [];
  return <Screen title={t('Check import', 'ഇറക്കുമതി പരിശോധിക്കുക')} back>
    {!preview && <><Label>{t('Fill the Excel template with households in walking order, then choose the file.', 'നടക്കുന്ന ക്രമത്തിൽ വീടുകൾ എക്സൽ മാതൃകയിൽ ചേർത്ത ശേഷം ഫയൽ തിരഞ്ഞെടുക്കുക.')}</Label>
      <Button secondary title={t('Get Excel template', 'എക്സൽ മാതൃക നേടുക')} busy={busy} onPress={() => run(async () => { await Sharing.shareAsync(templateFile().uri); })} /></>}
    {preview && <>
      {[...new Set(selected.map(r => r.route))].map(route => { const rows = selected.filter(r => r.route === route); return <View key={route} style={{ paddingVertical: 16, gap: 8 }}>
        <Label variant="title" bold>{route}</Label><Label>{rows.length} {t('households', 'വീടുകൾ')} · {rows.reduce((n, r) => n + r.codes.length, 0)} {t('copies', 'കോപ്പികൾ')}</Label>
      </View>; })}
      <Row title={t('Opening dues', 'മുൻ കുടിശ്ശിക')} />
      <Label variant="amount" bold>{money(selected.reduce((n, r) => n + r.pending.reduce((a, p) => a + p.amount, 0), 0))}</Label>
    </>}
    <Label>{t('First billing month for this batch', 'ഈ കൂട്ടത്തിന്റെ ആദ്യ ബില്ലിംഗ് മാസം')}</Label>
    <MonthPicker value={month} onChange={v => { setMonth(v); setPreview(undefined); setUri(''); setError(''); }} />
    <Button secondary title={preview ? t('Choose another file', 'മറ്റൊരു ഫയൽ തിരഞ്ഞെടുക്കുക') : t('Choose Excel file', 'എക്സൽ ഫയൽ തിരഞ്ഞെടുക്കുക')} busy={busy} onPress={() => run(async () => {
      const result = await File.pickFileAsync({ mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'] });
      if (result.canceled) return; const asset = result.result; setUri(asset.uri); setPreview(await readWorkbook(asset.uri, state, month));
    })} />
    {preview && <>
      <Row title={t('Review flagged rows', 'അടയാളപ്പെടുത്തിയ വരികൾ പരിശോധിക്കുക')} right={String(flagged.length)} onPress={() => setReview(!review)} />
      {review && flagged.map(row => <Pressable key={row.row} accessibilityRole="checkbox" accessibilityState={{ checked: row.include, disabled: !!row.errors.length }}
        disabled={!!row.errors.length} onPress={() => setPreview(p => p && ({ ...p, rows: p.rows.map(r => r.row === row.row ? { ...r, include: !r.include } : r) }))}
        style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name={row.include ? 'check-box' : 'check-box-outline-blank'} /><View style={{ flex: 1 }}>
          <Label bold>{row.row}. {row.name} · {row.route}</Label>
          <Label variant="secondary">{row.errors.join('\n') || t('Possible duplicate. Select to add as a new household.', 'സമാനമായ വീട്. പുതിയ വീടായി ചേർക്കാൻ തിരഞ്ഞെടുക്കുക.')}</Label>
        </View></Pressable>)}
      {preview.repeated && <ErrorText message={t('This file has already been imported.', 'ഈ ഫയൽ നേരത്തേ ചേർത്തതാണ്.')} />}
      <Button title={t('Continue', 'തുടരുക')} busy={busy} disabled={preview.repeated || !selected.length || !uri} onPress={() => run(async () => {
        await commitImport(preview, month); router.replace({ pathname: '/routes', params: { month } });
      })} />
    </>}
    <ErrorText message={error} />
  </Screen>;
}
