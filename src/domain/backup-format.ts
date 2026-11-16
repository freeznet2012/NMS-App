import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { z } from 'zod';
import { validateRegister } from './validation';
import type { Register } from './model';
const manifestSchema = z.object({ format: z.literal('NMS'), version: z.literal(1), createdAt: z.string().datetime(), lastChanged: z.string().datetime(),
  customers: z.number().int().nonnegative(), images: z.number().int().nonnegative(), hashes: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)) });
export type BackupManifest = z.infer<typeof manifestSchema>;
export type Checksum = (bytes: Uint8Array) => Promise<string>;
export async function encodeBackup(state: Register, images: Record<string, Uint8Array>, checksum: Checksum, createdAt = new Date().toISOString()) {
  validateRegister(state);
  const files: Record<string, Uint8Array> = { 'register.json': strToU8(JSON.stringify(state)) };
  for (const name of new Set(state.payments.flatMap(p => p.images))) {
    if (!images[name]) throw new Error('A payment image is missing. Backup was not created.');
    files['images/' + name] = images[name];
  }
  const hashes: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) hashes[name] = await checksum(bytes);
  const manifest: BackupManifest = { format: 'NMS', version: 1, createdAt, lastChanged: state.updatedAt, customers: state.households.length, images: Object.keys(files).length - 1, hashes };
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  return { manifest, bytes: zipSync(files, { level: 1 }) };
}
export async function decodeBackup(bytes: Uint8Array, checksum: Checksum) {
  if (bytes.length > 250_000_000) throw new Error('This backup exceeds the current 250 MB restore limit');
  let expanded = 0;
  const files = unzipSync(bytes, { filter: entry => { expanded += entry.originalSize; if (expanded > 500_000_000) throw new Error('Backup contents are too large'); return true; } });
  if (!files['manifest.json'] || !files['register.json']) throw new Error('Choose an NMS backup file');
  const manifest = manifestSchema.parse(JSON.parse(strFromU8(files['manifest.json'])));
  if (!manifest.hashes['register.json']) throw new Error('Missing register checksum');
  for (const [name, expected] of Object.entries(manifest.hashes)) {
    if (!files[name] || await checksum(files[name]) !== expected) throw new Error('Backup verification failed');
  }
  const state = validateRegister(JSON.parse(strFromU8(files['register.json'])));
  const names = new Set(state.payments.flatMap(p => p.images));
  if (manifest.customers !== state.households.length || manifest.images !== names.size || manifest.lastChanged !== state.updatedAt) throw new Error('Backup metadata does not match');
  for (const name of names) if (!manifest.hashes['images/' + name]) throw new Error('A payment image is missing from the backup');
  return { manifest, state, files };
}
