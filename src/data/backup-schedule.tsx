import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { File, Paths } from 'expo-file-system';
import { createBackup, inspectBackup, localBackups } from './backup';
import { snapshot } from './store';
import { backupDue } from '../domain/backup-policy';
const taskName = 'nms-nightly-backup-v1';
const statusFile = () => new File(Paths.document, 'backup-status.json');

type BackupStatus = { enabled?: boolean; scheduled?: boolean; error?: string; scheduleError?: string; checkedAt?: string };
const statusListeners = new Set<(status: BackupStatus) => void>();

export function backupStatus(): BackupStatus {
  try { const file = statusFile(); return file.exists ? JSON.parse(file.textSync()) : {}; } catch { return {}; }
}

export function subscribeBackupStatus(listener: (status: BackupStatus) => void) {
  statusListeners.add(listener);
  listener(backupStatus());
  return () => { statusListeners.delete(listener); };
}

function setStatus(update: BackupStatus) {
  const next = { ...backupStatus(), ...update };
  statusFile().write(JSON.stringify(next));
  for (const listener of statusListeners) listener(next);
}

export function recordVerifiedBackup() {
  setStatus({ error: '', checkedAt: new Date().toISOString() });
}

let working: Promise<void> | undefined;
export function checkOverdueBackup() {
  return working ??= (async () => {
    if (backupStatus().enabled === false) return;
    const state = await snapshot();
    if (!state.started) return;
    const latest = localBackups()[0];
    if (latest) {
      try {
        const { manifest } = await inspectBackup(latest.uri);
        if (!backupDue(state.updatedAt, manifest)) {
          if (backupStatus().error) setStatus({ error: '' });
          return;
        }
      } catch { /* Keep the damaged archive and create a fresh verified snapshot. */ }
    }
    if (backupStatus().enabled === false) return;
    await createBackup();
    recordVerifiedBackup();
  })().catch(error => { setStatus({ error: error.message, checkedAt: new Date().toISOString() }); throw error; }).finally(() => { working = undefined; });
}

let scheduling: Promise<void> = Promise.resolve();
function syncSchedule() {
  scheduling = scheduling.catch(() => undefined).then(async () => {
    try {
      if (isRunningInExpoGo() || !await TaskManager.isAvailableAsync()) {
        setStatus({ scheduled: false, scheduleError: '' });
        return;
      }
      const enabled = backupStatus().enabled !== false;
      const registered = await TaskManager.isTaskRegisteredAsync(taskName);
      if (enabled && !registered) await BackgroundTask.registerTaskAsync(taskName, { minimumInterval: 60 });
      if (!enabled && registered) await BackgroundTask.unregisterTaskAsync(taskName);
      setStatus({ scheduled: enabled, scheduleError: '' });
    } catch (error) {
      setStatus({ scheduled: false, scheduleError: (error as Error).message });
    }
  });
  return scheduling;
}

export async function setNightlyBackupEnabled(enabled: boolean) {
  setStatus({ enabled });
  await syncSchedule();
  if (enabled) await checkOverdueBackup();
}

TaskManager.defineTask(taskName, async () => {
  try { const hour = new Date().getHours(); if (hour >= 22 || hour < 6) await checkOverdueBackup(); return BackgroundTask.BackgroundTaskResult.Success; }
  catch { return BackgroundTask.BackgroundTaskResult.Failed; }
});
export function BackupLifecycle() {
  useEffect(() => {
    const check = () => { checkOverdueBackup().catch(() => undefined); };
    check();
    void syncSchedule().catch(() => undefined);
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') check(); });
    return () => subscription.remove();
  }, []);
  return null;
}
