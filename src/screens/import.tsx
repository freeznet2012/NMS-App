import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRegister } from '../data/store';
import { saveFileCopy } from '../data/export-file';
import { commitImport, readWorkbook, templateFile, workbookSizeLimitMB, type ImportPreview } from '../data/workbook';
import { Button, ErrorText, Icon, Label, Row, Screen, useWords } from '../components/ui';
import { MonthPicker } from '../components/month-picker';
import { money } from '../domain/model';
import { colors, sizes, spacing } from '../theme';

const workbookMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
type ImportAction = 'template' | 'file' | 'commit';

export function ImportScreen() {
  const state = useRegister();
  const t = useWords();
  const [month, setMonth] = useState(state.firstMonth);
  const [preview, setPreview] = useState<ImportPreview>();
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState<ImportAction>();
  const [error, setError] = useState('');
  const [download, setDownload] = useState('');
  const running = useRef(false);
  const selected = preview?.rows.filter(row => row.include) ?? [];
  const flagged = preview?.rows.filter(row => row.errors.length || row.possibleDuplicate) ?? [];

  async function run(action: ImportAction, task: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(action);
    setError('');
    try {
      await task();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      running.current = false;
      setBusy(undefined);
    }
  }

  function pickFile() {
    void run('file', async () => {
      const result = await File.pickFileAsync({ mimeTypes: [workbookMime, 'application/vnd.ms-excel'] });
      if (result.canceled) return;
      setPreview(undefined);
      setReview(false);
      setPreview(await readWorkbook(result.result.uri, state, month));
    });
  }

  const title = t('Import households', 'വീടുകൾ ഇറക്കുമതി ചെയ്യുക');
  const reviewTitle = t('Check import', 'ഇറക്കുമതി പരിശോധിക്കുക');
  const firstMonth = t('First billing month for this batch', 'ഈ കൂട്ടത്തിന്റെ ആദ്യ ബില്ലിംഗ് മാസം');
  const fileAction = preview ? t('Choose another file', 'മറ്റൊരു ഫയൽ തിരഞ്ഞെടുക്കുക') : t('Choose Excel file', 'എക്സൽ ഫയൽ തിരഞ്ഞെടുക്കുക');

  return <Screen title={preview ? reviewTitle : title} back>
    {!preview && <><Label style={styles.intro}>{t(
      'Import multiple households from an Excel file. Use the template and fill in households in walking order.',
      'എക്സൽ ഫയലിൽ നിന്ന് ഒന്നിലധികം വീടുകൾ ചേർക്കാം. മാതൃക ഉപയോഗിച്ച് വീടുകൾ നടന്നു പോകുന്ന ക്രമത്തിൽ രേഖപ്പെടുത്തുക.',
    )}</Label>

    <View style={styles.group}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!busy, busy: busy === 'template' }}
        disabled={!!busy} onPress={() => run('template', async () => {
          setDownload('');
          const file = templateFile();
          const name = await saveFileCopy(file, file.name, workbookMime);
          if (name) setDownload(t('Saved ' + name, name + ' സൂക്ഷിച്ചു'));
        })} style={({ pressed }) => [styles.template, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="microsoft-excel" size={36} color={colors.paid} />
        <View style={styles.fill}>
          <Label variant="headline" bold>{t('Download Excel template', 'എക്സൽ മാതൃക ഡൗൺലോഡ് ചെയ്യുക')}</Label>
          <Label style={styles.supporting}>{t('Columns and sample periodicals', 'കോളങ്ങളും ഉദാഹരണ പത്രങ്ങളും')}</Label>
        </View>
        {busy === 'template' ? <ActivityIndicator color={colors.blue} /> : <Icon name="file-download" color={colors.blue} />}
      </Pressable>
      {!!download && <Label accessibilityLiveRegion="polite" variant="secondary" style={styles.supporting}>{download}</Label>}
    </View></>}

    <View style={styles.group}>
      <Label bold>{firstMonth}<Label style={styles.required}> *</Label></Label>
      <MonthPicker label={firstMonth} title={t('Select first billing month', 'ആദ്യ ബില്ലിംഗ് മാസം തിരഞ്ഞെടുക്കുക')}
        value={month} compact onChange={value => {
          if (running.current) return;
          setMonth(value);
          setPreview(undefined);
          setReview(false);
          setError('');
        }} />
      <Label variant="secondary" style={styles.supporting}>{t(
        'Bills will be created from this month for all imported households.',
        'ചേർക്കുന്ന എല്ലാ വീടുകൾക്കും ഈ മാസം മുതൽ ബില്ലുകൾ തയ്യാറാക്കും.',
      )}</Label>
    </View>

    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!busy, busy: busy === 'file' }}
      disabled={!!busy} onPress={pickFile} style={({ pressed }) => [styles.upload, preview && styles.selectedFile, pressed && styles.pressed]}>
      {busy === 'file' ? <ActivityIndicator color={colors.blue} size="large" /> :
        <MaterialCommunityIcons name={preview ? 'file-excel-outline' : 'cloud-upload-outline'} size={38} color={colors.blue} />}
      {preview && <Label bold style={styles.center}>{preview.name}</Label>}
      <Label variant={preview ? 'body' : 'headline'} bold style={[styles.center, preview && styles.link]}>{fileAction}</Label>
      {!preview && <Label style={styles.center}>{t('Browse files on your device', 'ഫോണിൽ നിന്ന് ഫയൽ തിരയുക')}</Label>}
      {!preview && <Label variant="secondary" style={[styles.center, styles.supporting]}>{t(
        `Excel .xlsx or .xls · Up to ${workbookSizeLimitMB} MB`,
        `Excel .xlsx അല്ലെങ്കിൽ .xls · ${workbookSizeLimitMB} MB വരെ`,
      )}</Label>}
    </Pressable>

    {!preview && <View style={styles.info}>
      <Icon name="info-outline" color={colors.blue} size={26} />
      <View style={styles.fill}>
        <Label variant="headline" bold>{t('Template columns', 'മാതൃകയിലെ കോളങ്ങൾ')}</Label>
        <Label>{t(
          'Household, Route, Delivery boy and Periodicals are required. Phone and opening dues are optional.',
          'വീട്, റൂട്ട്, വിതരണക്കാരൻ, പത്രങ്ങൾ എന്നിവ നിർബന്ധമാണ്. ഫോൺ നമ്പറും പഴയ കുടിശ്ശികയും വേണമെങ്കിൽ ചേർക്കാം.',
        )}</Label>
      </View>
    </View>}

    {preview && <View style={styles.group}>
      {[...new Set(selected.map(row => row.route))].map(route => {
        const rows = selected.filter(row => row.route === route);
        const copies = rows.reduce((total, row) => total + row.codes.length, 0);
        const householdsLabel = rows.length === 1 ? t('household', 'വീട്') : t('households', 'വീടുകൾ');
        const copiesLabel = copies === 1 ? t('copy', 'കോപ്പി') : t('copies', 'കോപ്പികൾ');
        return <Row key={route} title={route} detail={`${rows.length} ${householdsLabel} · ${copies} ${copiesLabel}`} />;
      })}
      <Row title={t('Opening dues', 'മുൻ കുടിശ്ശിക')}
        right={money(selected.reduce((total, row) => total + row.pending.reduce((sum, due) => sum + due.amount, 0), 0))} />
      {flagged.length > 0 && <Row title={t('Review flagged rows', 'അടയാളപ്പെടുത്തിയ വരികൾ പരിശോധിക്കുക')}
        right={String(flagged.length)} onPress={() => setReview(value => !value)} />}
      {review && flagged.map(row => <Pressable key={row.row} accessibilityRole="checkbox"
        accessibilityState={{ checked: row.include, disabled: !!busy || !!row.errors.length }} disabled={!!busy || !!row.errors.length}
        onPress={() => setPreview(current => current && ({ ...current, rows: current.rows.map(entry =>
          entry.row === row.row ? { ...entry, include: !entry.include } : entry) }))}
        style={styles.flagged}>
        <Icon name={row.include ? 'check-box' : 'check-box-outline-blank'} />
        <View style={styles.fill}>
          <Label bold>{row.row}. {row.name} · {row.route}</Label>
          <Label variant="secondary">{row.errors.join('\n') || t(
            'Possible duplicate. Select to add as a new household.',
            'സമാനമായ വീട്. പുതിയ വീടായി ചേർക്കാൻ തിരഞ്ഞെടുക്കുക.',
          )}</Label>
        </View>
      </Pressable>)}
      {preview.repeated && <ErrorText message={t('This file has already been imported.', 'ഈ ഫയൽ നേരത്തേ ചേർത്തതാണ്.')} />}
      {!preview.repeated && !selected.length && <ErrorText
        message={t('No households selected for import.', 'ചേർക്കാൻ വീടുകളൊന്നും തിരഞ്ഞെടുത്തിട്ടില്ല.')} />}
    </View>}

    <ErrorText message={error} />
    <Button title={title} busy={busy === 'commit'} disabled={!!busy || !selected.length || !!preview?.repeated}
      onPress={() => {
        if (!preview) return;
        void run('commit', async () => {
          await commitImport(preview, month);
          router.replace({ pathname: '/routes', params: { month } });
        });
      }} />
  </Screen>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, gap: spacing.xs },
  intro: { paddingHorizontal: spacing.xs, marginBottom: spacing.xs },
  group: { gap: spacing.xs },
  template: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderColor: colors.softBorder, borderRadius: sizes.panelRadius, padding: spacing.md, backgroundColor: colors.canvas },
  supporting: { color: colors.navigationInk },
  required: { color: colors.error },
  upload: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.lg,
    borderStyle: 'dashed', borderWidth: 1, borderColor: colors.muted, borderRadius: sizes.panelRadius, backgroundColor: colors.canvas },
  selectedFile: { minHeight: 96, padding: spacing.md },
  center: { textAlign: 'center' },
  link: { color: colors.blue },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md,
    borderRadius: sizes.panelRadius, backgroundColor: colors.panel },
  flagged: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.72 },
});
