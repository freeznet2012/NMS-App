import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { File, Paths } from 'expo-file-system';
import { createBackup, inspectBackup, localBackups } from './backup';
import { snapshot } from './store';
const taskName = 'nms-nightly-backup-v1';
const statusFile = () => new File(Paths.document, 'backup-status.json');
export function backupStatus(): { scheduled?: boolean; error?: string; checkedAt?: string } {
  try { const file = statusFile(); return file.exists ? JSON.parse(file.textSync()) : {}; } catch { return {}; }
}
function setStatus(update: ReturnType<typeof backupStatus>) { statusFile().write(JSON.stringify({ ...backupStatus(), ...update })); }
let working: Promise<void> | undefined;
export function checkOverdueBackup() {
  return working ??= (async () => {
    const state = await snapshot(); if (!state.started) return;
    const latest = localBackups()[0];
    if (latest) {
      try {
        const { manifest } = await inspectBackup(latest.uri);
        if (manifest.lastChanged === state.updatedAt || Date.now() - Date.parse(manifest.createdAt) < 24 * 60 * 60 * 1000) return;
      } catch { /* Keep the damaged archive and create a fresh verified snapshot. */ }
    }
    await createBackup();
    setStatus({ error: '', checkedAt: new Date().toISOString() });
  })().catch(error => { setStatus({ error: error.message, checkedAt: new Date().toISOString() }); throw error; }).finally(() => { working = undefined; });
}
TaskManager.defineTask(taskName, async () => {
  try { const hour = new Date().getHours(); if (hour >= 22 || hour < 6) await checkOverdueBackup(); return BackgroundTask.BackgroundTaskResult.Success; }
  catch { return BackgroundTask.BackgroundTaskResult.Failed; }
});
export function BackupLifecycle() {
  useEffect(() => {
    const check = () => { checkOverdueBackup().catch(() => undefined); };
    check();
    TaskManager.isAvailableAsync().then(async available => {
      if (!available || isRunningInExpoGo()) { setStatus({ scheduled: false, error: '' }); return; }
      if (!await TaskManager.isTaskRegisteredAsync(taskName)) await BackgroundTask.registerTaskAsync(taskName, { minimumInterval: 60 });
      setStatus({ scheduled: true });
    }).catch(e => setStatus({ scheduled: false, error: e.message }));
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') check(); });
    return () => subscription.remove();
  }, []);
  return null;
}
