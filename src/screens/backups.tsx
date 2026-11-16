import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Directory, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { createBackup, inspectBackup, localBackups, restoreBackup, type BackupManifest } from '../data/backup';
import { backupStatus } from '../data/backup-schedule';
import { useRegister } from '../data/store';
import { Button, ErrorText, Label, Row, Screen, useWords } from '../components/ui';

export function BackupsScreen() {
  const state = useRegister(); const t = useWords();
  const [files, setFiles] = useState(localBackups); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [latest, setLatest] = useState<BackupManifest>();
  useEffect(() => { let live = true; if (files[0]) inspectBackup(files[0].uri).then(result => { if (live) setLatest(result.manifest); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [files]);
  async function run(task: () => Promise<void>) { if (busy) return; setBusy(true); setError(''); try { await task(); setFiles(localBackups()); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function chooseRestore(uri: string) {
    const checked = await inspectBackup(uri);
    Alert.alert(t('Restore this backup?', 'ഈ ബാക്കപ്പ് പുനഃസ്ഥാപിക്കണോ?'),
      t('This replaces the register on this phone. A recovery copy of the current register is saved first.', 'ഈ ഫോണിലെ രജിസ്റ്റർ മാറ്റപ്പെടും. നിലവിലെ രജിസ്റ്ററിന്റെ പകർപ്പ് ആദ്യം സൂക്ഷിക്കും.') + '\n\n' +
      new Date(checked.manifest.createdAt).toLocaleString() + '\n' + checked.manifest.customers + ' ' + t('households', 'വീടുകൾ'),
      [{ text: t('Cancel', 'റദ്ദാക്കുക'), style: 'cancel' }, { text: t('Restore', 'പുനഃസ്ഥാപിക്കുക'), onPress: () => run(async () => { await restoreBackup(uri); router.replace('/'); }) }]);
  }
  return <Screen title={t('Backups', 'ബാക്കപ്പുകൾ')} back>
    <Row title={t('Last register change', 'രജിസ്റ്ററിലെ അവസാന മാറ്റം')} detail={new Date(state.updatedAt).toLocaleString()} />
    <Row title={t('On this phone', 'ഈ ഫോണിൽ')} detail={latest ? new Date(latest.createdAt).toLocaleString() : t('No verified backup yet', 'പരിശോധിച്ച ബാക്കപ്പ് ഇല്ല')} />
    {latest && <Row title={t('Last change included in backup', 'ബാക്കപ്പിൽ ഉൾപ്പെട്ട അവസാന മാറ്റം')} detail={new Date(latest.lastChanged).toLocaleString()} />}
    <Button title={t('Back up now', 'ഇപ്പോൾ ബാക്കപ്പ് എടുക്കുക')} busy={busy} onPress={() => run(async () => { await createBackup(); })} />
    {files[0] && <><Button secondary title={t('Save backup file', 'ബാക്കപ്പ് ഫയൽ സൂക്ഷിക്കുക')} busy={busy} onPress={() => run(async () => { const folder = await Directory.pickDirectoryAsync(); const target = folder.createFile(files[0].name, 'application/octet-stream'); files[0].copy(target); })} />
      <Button secondary title={t('Share backup', 'ബാക്കപ്പ് പങ്കിടുക')} busy={busy} onPress={() => run(async () => { await Sharing.shareAsync(files[0].uri, { mimeType: 'application/octet-stream' }); })} /></>}
    <Label variant="secondary">{t('Save a copy outside this phone using the share menu, for example to Google Drive.', 'ഷെയർ മെനു വഴി ഫോണിന് പുറത്തും ഒരു പകർപ്പ് സൂക്ഷിക്കുക, ഉദാഹരണത്തിന് ഗൂഗിൾ ഡ്രൈവിൽ.')}</Label>
    <Row title="Google Drive" detail={t('Automatic upload is not configured yet', 'സ്വയമേവ അപ്‌ലോഡ് സജ്ജീകരിച്ചിട്ടില്ല')} />
    <Row title={t('Nightly backup', 'രാത്രിയിലെ ബാക്കപ്പ്')} detail={backupStatus().scheduled ? t('Scheduled. Android chooses the exact time; overdue backups run when you reopen NMS.', 'സജ്ജീകരിച്ചു. കൃത്യസമയം ആൻഡ്രോയിഡ് തീരുമാനിക്കും; വൈകിയാൽ NMS വീണ്ടും തുറക്കുമ്പോൾ എടുക്കും.') : t('Overdue checks are enabled. Background scheduling needs an installed Android build.', 'വൈകിയ ബാക്കപ്പ് പരിശോധിക്കും. പശ്ചാത്തല പ്രവർത്തനത്തിന് ഇൻസ്റ്റാൾ ചെയ്ത ആൻഡ്രോയിഡ് ബിൽഡ് വേണം.')} />
    {backupStatus().error && <ErrorText message={backupStatus().error!} />}
    <Button secondary title={t('Choose backup to restore', 'പുനഃസ്ഥാപിക്കാൻ ബാക്കപ്പ് തിരഞ്ഞെടുക്കുക')} busy={busy} onPress={() => run(async () => {
      const result = await File.pickFileAsync({ mimeTypes: ['*/*'] });
      if (!result.canceled) await chooseRestore(result.result.uri);
    })} />
    {files.map(file => <Row key={file.uri} title={file.name} detail={t('Tap to inspect and restore', 'പരിശോധിച്ച് പുനഃസ്ഥാപിക്കാൻ തൊടുക')} onPress={() => run(() => chooseRestore(file.uri))} />)}
    <ErrorText message={error} />
  </Screen>;
}
