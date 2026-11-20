import React, { useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { changeRegister, newId, snapshot, useRegister } from '../src/data/store';
import { prepareMonth } from '../src/domain/billing';
import { lastCompletedMonth, money, monthKey, type Register } from '../src/domain/model';
import { type ReportSelection } from '../src/domain/reports';
import { reportData, reportExcel, reportHtml, reportPdf } from '../src/data/reports';
import { saveFileCopy } from '../src/data/export-file';
import { Button, Choice, ErrorText, Icon, Label, Row, Screen, useWords } from '../src/components/ui';
import { MonthPicker } from '../src/components/month-picker';
export default function ReportsScreen() {
  const state = useRegister(); const t = useWords();
  const [selection, setSelection] = useState<ReportSelection>({ month: lastCompletedMonth(), type: 'master', scope: 'all', scopeId: '' });
  const [choice, setChoice] = useState<'scope' | 'id'>(); const [preview, setPreview] = useState<Register>(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const data = preview && reportData(preview, selection);
  async function run(task: () => Promise<void>) { if (busy) return; setBusy(true); setError(''); try { await task(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  const change = (patch: Partial<ReportSelection>) => { setSelection(s => ({ ...s, ...patch })); setPreview(undefined); };
  return <Screen title={t('Reports', 'റിപ്പോർട്ടുകൾ')} back tabs="manage" scroll={false}>
    <FlatList data={data?.rows ?? []} keyExtractor={row => row.customerId} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 24 }}
      renderItem={({ item: row }) => <Row title={row.position + '. ' + row.name} detail={row.route + ' · ' + row.papers} right={selection.type === 'dues' ? money(row.remaining) : undefined} />}
      ListHeaderComponent={<View style={{ gap: 16 }}>
    {(['master', 'dues'] as const).map(type => <Pressable key={type} accessibilityRole="radio" accessibilityState={{ checked: selection.type === type }} onPress={() => change({ type })} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 16 }}><Icon name={selection.type === type ? 'radio-button-checked' : 'radio-button-unchecked'} /><Label bold>{type === 'master' ? t('Master list', 'പ്രധാന പട്ടിക') : t('Monthly dues', 'മാസ കുടിശ്ശിക')}</Label></Pressable>)}
    <MonthPicker label={t('Report month', 'റിപ്പോർട്ട് മാസം')} title={t('Select report month', 'റിപ്പോർട്ട് മാസം തിരഞ്ഞെടുക്കുക')}
      value={selection.month} maxMonth={monthKey(new Date())} onChange={month => change({ month })} />
    <Row title={t('Scope', 'പരിധി')} detail={selection.scope === 'all' ? t('All households', 'എല്ലാ വീടുകളും') : selection.scope === 'route' ? t('Route', 'റൂട്ട്') : t('Delivery boy', 'വിതരണക്കാരൻ')} onPress={() => setChoice('scope')} />
    {selection.scope !== 'all' && <Row title={selection.scope === 'route' ? t('Route', 'റൂട്ട്') : t('Delivery boy', 'വിതരണക്കാരൻ')} detail={(selection.scope === 'route' ? state.routes : state.boys).find(r => r.id === selection.scopeId)?.name ?? t('Choose', 'തിരഞ്ഞെടുക്കുക')} onPress={() => setChoice('id')} />}
    <Button title={t('Preview report', 'റിപ്പോർട്ട് കാണുക')} busy={busy} disabled={selection.scope !== 'all' && !selection.scopeId} onPress={() => run(async () => { await changeRegister(d => prepareMonth(d, selection.month, newId)); setPreview(await snapshot()); })} />
    <ErrorText message={error} />
    {data && preview && <><Label>{data.rows.length} {t('households', 'വീടുകൾ')} · {data.month}</Label>
      {selection.type === 'dues' && <Row title={t('Still due', 'ബാക്കി')} right={money(data.total.remaining)} />}
      <Button secondary title={t('Export Excel', 'എക്സൽ കയറ്റുമതി')} busy={busy} onPress={() => run(async () => { await Sharing.shareAsync(reportExcel(preview, selection).uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); })} />
      <Button secondary title={t('Save PDF', 'PDF സൂക്ഷിക്കുക')} busy={busy} onPress={() => run(async () => {
        const pdf = await reportPdf(preview, selection);
        const name = await saveFileCopy(new File(pdf.uri), 'NMS-' + selection.type + '-' + selection.month + '.pdf', 'application/pdf');
        if (name) Alert.alert(t('PDF saved', 'PDF സൂക്ഷിച്ചു'), name);
      })} />
      <Button secondary title={t('Print', 'പ്രിന്റ്')} busy={busy} onPress={() => run(async () => { await Print.printAsync({ html: reportHtml(preview, selection) }); })} />
    </>}
    </View>} />
    {choice && <Choice title={t('Choose', 'തിരഞ്ഞെടുക്കുക')} options={choice === 'scope' ? [{ value: 'all', label: t('All households', 'എല്ലാ വീടുകളും') }, { value: 'route', label: t('Route', 'റൂട്ട്') }, { value: 'boy', label: t('Delivery boy', 'വിതരണക്കാരൻ') }] : (selection.scope === 'route' ? state.routes : state.boys).map(r => ({ value: r.id, label: r.name }))}
      onChoose={v => choice === 'scope' ? change({ scope: v as ReportSelection['scope'], scopeId: '' }) : change({ scopeId: v })} onDismiss={() => setChoice(undefined)} />}
  </Screen>;
}
