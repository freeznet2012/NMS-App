// @refresh reset
import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { emptyRegister, latestRegisterFileVersion, registerFileVersion, type Register, type Activity } from '../domain/model';
import { validateRegister } from '../domain/validation';
import { ActivityIndicator, Text, View } from 'react-native';

export const newId = () => Crypto.randomUUID();
let database: SQLite.SQLiteDatabase;
let current: Register;
const subscribers = new Set<() => void>();
let queue: Promise<unknown> = Promise.resolve();
let initialization: Promise<void> | undefined;
export function ensureRegister() { return initialization ??= initialize().catch(error => { initialization = undefined; throw error; }); }

async function initialize() {
  database = await SQLite.openDatabaseAsync('nms.db', { useNewConnection: true });
  await database.execAsync('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS register (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, data TEXT NOT NULL);');
  const row = await database.getFirstAsync<{ data: string; version: number }>('SELECT data, version FROM register WHERE id=1');
  if (row && (row.version < 1 || row.version > latestRegisterFileVersion)) {
    throw new Error('This register requires a newer app version');
  }
  current = row ? validateRegister(JSON.parse(row.data)) : emptyRegister();
  if (!row) await database.runAsync('INSERT INTO register VALUES (1,1,?)', JSON.stringify(current));
}

export function changeRegister(update: (draft: Register) => void, activity?: Omit<Activity, 'id' | 'at'>): Promise<void> {
  const operation = queue.then(async () => {
    const next: Register = JSON.parse(JSON.stringify(current));
    update(next);
    if (!activity && JSON.stringify(next) === JSON.stringify(current)) return;
    next.updatedAt = new Date().toISOString();
    if (activity) next.activity.push({ ...activity, id: newId(), at: next.updatedAt });
    validateRegister(next);
    await database.withExclusiveTransactionAsync(async transaction => {
      await transaction.runAsync('UPDATE register SET version=?, data=? WHERE id=1', registerFileVersion(next), JSON.stringify(next));
    });
    current = next;
    subscribers.forEach(notify => notify());
  });
  queue = operation.catch(() => undefined);
  return operation;
}

export async function snapshot(): Promise<Register> {
  await ensureRegister();
  await queue;
  return JSON.parse(JSON.stringify(current));
}
export async function restoreRegister(state: Register): Promise<void> {
  validateRegister(state);
  // Restore is serialized with saves. Preserve the backup's own change timestamp.
  const operation = queue.then(async () => {
    await database.withExclusiveTransactionAsync(async transaction => {
      await transaction.runAsync('UPDATE register SET version=?, data=? WHERE id=1', registerFileVersion(state), JSON.stringify(state));
    });
    current = state;
    subscribers.forEach(notify => notify());
  });
  queue = operation.catch(() => undefined);
  return operation;
}
const Ready = createContext(false);
export function RegisterProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { ensureRegister().then(() => setReady(true)).catch(e => setError(String(e.message))); }, []);
  if (!ready || !current) return <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
    {error ? <Text accessibilityRole="alert">{error}</Text> : <ActivityIndicator accessibilityLabel="Opening register" />}
  </View>;
  return <Ready.Provider value>{children}</Ready.Provider>;
}
export function useRegister(): Register {
  if (!useContext(Ready)) throw new Error('Register is not ready');
  return useSyncExternalStore(callback => { subscribers.add(callback); return () => { subscribers.delete(callback); }; }, () => current);
}
