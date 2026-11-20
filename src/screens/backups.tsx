import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Host, Switch } from '@expo/ui/jetpack-compose';
import { defaultMinSize, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { createBackup, inspectBackup, localBackups, restoreBackup, type BackupManifest } from '../data/backup';
import { backupStatus, recordVerifiedBackup, setNightlyBackupEnabled, subscribeBackupStatus } from '../data/backup-schedule';
import { saveFileCopy } from '../data/export-file';
import { useRegister } from '../data/store';
import { Button, ErrorText, Icon, Label, Row, Screen, useWords } from '../components/ui';
import { colors, sizes, spacing } from '../theme';

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Action = 'backup' | 'save' | 'share' | 'nightly' | 'restore';
type Inspection = { uri: string; manifest?: BackupManifest; error?: string };
const backupMime = 'application/octet-stream';

function BackupLine({ icon, title, detail }: { icon: Glyph; title: string; detail: string }) {
  return <>
    <View style={styles.iconTile}>
      <MaterialCommunityIcons name={icon} size={26} color={colors.blue} />
    </View>
    <View style={styles.text}>
      <Label bold>{title}</Label>
      <Label variant="secondary" style={styles.supporting}>{detail}</Label>
    </View>
  </>;
}

export function BackupsScreen() {
  const state = useRegister();
  const t = useWords();
  const { width, fontScale } = useWindowDimensions();
  const stackActions = width / Math.max(1, fontScale) < 350 || state.language === 'ml';
  const [files, setFiles] = useState(localBackups);
  const [inspection, setInspection] = useState<Inspection>();
  const [status, setStatus] = useState(backupStatus);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<Action>();
  const [error, setError] = useState('');
  const running = useRef(false);
  const latestFile = files[0];
  const latestUri = latestFile?.uri;
  const latest = inspection && inspection.uri === latestUri ? inspection : undefined;
  const verified = latest?.manifest;
  const nightlyEnabled = status.enabled !== false;
  const date = new Intl.DateTimeFormat(state.language === 'ml' ? 'ml-IN' : 'en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  });

  useEffect(() => subscribeBackupStatus(setStatus), []);
  useEffect(() => { setFiles(localBackups()); }, [status.checkedAt]);
  useEffect(() => {
    if (!latestUri) return;
    let live = true;
    inspectBackup(latestUri).then(({ manifest }) => {
      if (live) setInspection({ uri: latestUri, manifest });
    }).catch(reason => {
      if (live) setInspection({ uri: latestUri, error: (reason as Error).message });
    });
    return () => { live = false; };
  }, [latestUri]);

  async function run(action: Action, task: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(action);
    setError('');
    try {
      await task();
      setFiles(localBackups());
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      running.current = false;
      setBusy(undefined);
    }
  }

  async function chooseRestore(uri: string) {
    const { manifest } = await inspectBackup(uri);
    Alert.alert(t('Restore this backup?', 'ഈ ബാക്കപ്പ് പുനഃസ്ഥാപിക്കണോ?'),
      [
        t('This replaces the register on this phone. A recovery copy of the current register is saved first.',
          'ഈ ഫോണിലെ രജിസ്റ്റർ മാറ്റപ്പെടും. നിലവിലെ രജിസ്റ്ററിന്റെ പകർപ്പ് ആദ്യം സൂക്ഷിക്കും.'),
        date.format(new Date(manifest.createdAt)) + ' · ' + manifest.customers + ' ' + t('households', 'വീടുകൾ'),
        t('Last change', 'അവസാന മാറ്റം') + ' · ' + date.format(new Date(manifest.lastChanged)),
      ].join('\n\n'),
      [
        { text: t('Cancel', 'റദ്ദാക്കുക'), style: 'cancel' },
        { text: t('Restore', 'പുനഃസ്ഥാപിക്കുക'), onPress: () => run('restore', async () => { await restoreBackup(uri); router.replace('/'); }) },
      ]);
  }

  const noVerified = t('No verified backup yet', 'പരിശോധിച്ച ബാക്കപ്പ് ഇല്ല');
  const checking = !!latestUri && !latest;
  const failed = !!latest?.error || !!status.error;
  const health = failed ? t('Check your backups', 'ബാക്കപ്പുകൾ പരിശോധിക്കുക') :
    verified ? t('Backups are working', 'ബാക്കപ്പ് പ്രവർത്തിക്കുന്നു') :
    checking ? t('Verifying backup…', 'ബാക്കപ്പ് പരിശോധിക്കുന്നു…') : noVerified;
  const lastBackup = verified ? date.format(new Date(verified.createdAt)) : checking ? '…' : '—';
  const lastChange = verified ? date.format(new Date(verified.lastChanged)) : '—';
  const shareTitle = t('Share backup', 'ബാക്കപ്പ് പങ്കിടുക');
  const driveDetail = t('Automatic upload is not configured yet', 'സ്വയമേവ അപ്‌ലോഡ് സജ്ജീകരിച്ചിട്ടില്ല');
  const nightlyTitle = t('Nightly backup', 'രാത്രിയിലെ ബാക്കപ്പ്');
  const nightlyDetail = nightlyEnabled ? status.scheduled ?
    t('Scheduled. Android chooses the time. Overdue backups run when you reopen NMS.',
      'സജ്ജീകരിച്ചു. സമയം ആൻഡ്രോയിഡ് തീരുമാനിക്കും. വൈകിയാൽ NMS തുറക്കുമ്പോൾ ബാക്കപ്പ് എടുക്കും.') :
    t('Overdue backups run when you reopen NMS. Background scheduling is unavailable.',
      'NMS തുറക്കുമ്പോൾ വൈകിയ ബാക്കപ്പ് എടുക്കും. പശ്ചാത്തല ബാക്കപ്പ് ലഭ്യമല്ല.') :
    t('Off. You can still back up manually.', 'ഓഫ്. നിങ്ങൾക്ക് സ്വയം ബാക്കപ്പ് എടുക്കാം.');
  const share = () => run('share', () => Sharing.shareAsync(latestFile.uri, { mimeType: backupMime }));

  return <Screen title={t('Backups', 'ബാക്കപ്പുകൾ')} back>
    <View accessibilityLiveRegion="polite" style={[styles.banner, failed && styles.warning]}>
      <MaterialCommunityIcons name={failed ? 'cloud-alert-outline' : verified ? 'cloud-check-outline' : 'cloud-outline'}
        size={37} color={failed ? colors.warning : colors.blue} />
      <View style={styles.text}>
        <Label variant="headline" bold>{health}</Label>
        {verified && <Label>{t('Last backup', 'അവസാന ബാക്കപ്പ്')} · {lastBackup}</Label>}
      </View>
    </View>

    <View style={styles.card}>
      <View style={styles.metadata}>
        <BackupLine icon="text-box-outline" title={t('Last register change', 'രജിസ്റ്ററിലെ അവസാന മാറ്റം')}
          detail={date.format(new Date(state.updatedAt))} />
      </View>
      <View style={[styles.metadata, styles.divided]}>
        <BackupLine icon="cellphone" title={t('On this phone', 'ഈ ഫോണിൽ')} detail={lastBackup} />
      </View>
      <View style={[styles.metadata, styles.divided]}>
        <BackupLine icon="cloud-outline" title={t('Last change included in backup', 'ബാക്കപ്പിൽ ഉൾപ്പെട്ട അവസാന മാറ്റം')}
          detail={lastChange} />
      </View>
    </View>

    <View style={styles.actions}>
      <Button title={t('Back up now', 'ഇപ്പോൾ ബാക്കപ്പ് എടുക്കുക')} icon="cloud-upload" busy={busy === 'backup'}
        disabled={!!busy && busy !== 'backup'} onPress={() => run('backup', async () => {
          await createBackup();
          recordVerifiedBackup();
        })} />
      <View style={stackActions ? styles.stacked : styles.inline}>
        <View style={!stackActions && styles.fill}>
          <Button secondary title={t('Save backup file', 'ബാക്കപ്പ് ഫയൽ സൂക്ഷിക്കുക')} icon="file-download" busy={busy === 'save'}
            disabled={!verified || (!!busy && busy !== 'save')} onPress={() => run('save', async () => {
              const name = await saveFileCopy(latestFile, latestFile.name, backupMime);
              if (name) Alert.alert(t('Backup file saved', 'ബാക്കപ്പ് ഫയൽ സൂക്ഷിച്ചു'), name);
            })} />
        </View>
        <View style={!stackActions && styles.fill}>
          <Button secondary title={shareTitle} icon="share" busy={busy === 'share'}
            disabled={!verified || (!!busy && busy !== 'share')} onPress={share} />
        </View>
      </View>
      <View style={styles.note}>
        <Icon name="info-outline" size={21} color={colors.muted} />
        <Label variant="secondary" style={[styles.fill, styles.supporting]}>{t(
          'Save a copy outside this phone using the share menu, for example to Google Drive.',
          'ഷെയർ മെനു ഉപയോഗിച്ച് ഫോണിന് പുറത്തും ഒരു പകർപ്പ് സൂക്ഷിക്കുക, ഉദാഹരണത്തിന് ഗൂഗിൾ ഡ്രൈവിൽ.',
        )}</Label>
      </View>
    </View>

    <Pressable accessibilityRole="button" accessibilityLabel={t('Google Drive options', 'ഗൂഗിൾ ഡ്രൈവ് ഓപ്ഷനുകൾ')}
      disabled={!!busy} onPress={() => Alert.alert('Google Drive', driveDetail, [
        { text: t('Close', 'അടയ്ക്കുക'), style: 'cancel' },
        ...(verified ? [{ text: shareTitle, onPress: share }] : []),
      ])} style={({ pressed }) => [styles.setting, pressed && styles.pressed]}>
      <BackupLine icon="google-drive" title="Google Drive" detail={driveDetail} />
      <Icon name="chevron-right" color={colors.blue} size={22} />
    </Pressable>

    <View style={styles.setting}>
      <BackupLine icon="calendar-month-outline" title={nightlyTitle} detail={nightlyDetail} />
      <Host matchContents>
        <Switch value={nightlyEnabled} enabled={!busy}
          onCheckedChange={enabled => { void run('nightly', () => setNightlyBackupEnabled(enabled)); }}
          colors={{ checkedTrackColor: colors.navigationActive, checkedThumbColor: colors.surface }}
          modifiers={[semantics({ contentDescription: nightlyTitle }), defaultMinSize({ minWidth: 52, minHeight: sizes.touch })]} />
      </Host>
    </View>
    <ErrorText message={error || latest?.error || status.error || status.scheduleError || ''} />

    <Button secondary title={t('Choose backup to restore', 'പുനഃസ്ഥാപിക്കാൻ ബാക്കപ്പ് തിരഞ്ഞെടുക്കുക')} icon="restore"
      busy={busy === 'restore'} disabled={!!busy && busy !== 'restore'} onPress={() => run('restore', async () => {
        const result = await File.pickFileAsync({ mimeTypes: ['*/*'] });
        if (!result.canceled) await chooseRestore(result.result.uri);
      })} />
    {files.length > 0 && <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => [styles.archiveHeader, pressed && styles.pressed]}>
        <Label bold style={styles.fill}>{t('Backups on this phone', 'ഈ ഫോണിലെ ബാക്കപ്പുകൾ')}</Label>
        <Label variant="secondary">{files.length}</Label>
        <Icon name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} color={colors.blue} />
      </Pressable>
      {expanded && <View style={styles.archives}>{files.map(file => <Row key={file.uri} title={file.name}
        detail={t('Tap to inspect and restore', 'പരിശോധിച്ച് പുനഃസ്ഥാപിക്കാൻ തൊടുക')}
        onPress={() => run('restore', () => chooseRestore(file.uri))} />)}</View>}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  text: { flex: 1, gap: spacing.xs },
  supporting: { color: colors.navigationInk },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 74,
    padding: spacing.lg, backgroundColor: colors.panel, borderRadius: sizes.panelRadius, borderWidth: 1, borderColor: colors.divider },
  warning: { backgroundColor: colors.warningSurface },
  card: { borderWidth: 1, borderColor: colors.softBorder, borderRadius: sizes.panelRadius, paddingHorizontal: spacing.md },
  metadata: { minHeight: 59, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.divider },
  iconTile: { width: 42, height: 42, borderRadius: sizes.panelRadius, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.canvas },
  actions: { gap: spacing.md },
  inline: { flexDirection: 'row', gap: spacing.sm },
  stacked: { gap: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  setting: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md,
    minHeight: 64, borderWidth: 1, borderColor: colors.softBorder, borderRadius: sizes.panelRadius },
  archiveHeader: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  archives: { paddingHorizontal: spacing.sm },
  pressed: { backgroundColor: colors.secondary },
});
