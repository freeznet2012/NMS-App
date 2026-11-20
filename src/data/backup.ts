import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { snapshot, restoreRegister, newId } from './store';
import { encodeBackup, decodeBackup } from '../domain/backup-format';
export type { BackupManifest } from '../domain/backup-format';

export const attachments = new Directory(Paths.document, 'attachments');
export const backups = new Directory(Paths.document, 'backups');
function directories() {
  attachments.create({ intermediates: true, idempotent: true });
  backups.create({ intermediates: true, idempotent: true });
}
export async function keepImage(uri: string): Promise<string> {
  directories();
  const source = new File(uri);
  const bytes = await source.bytes();
  const extension = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 ? '.png' :
    bytes[0] === 255 && bytes[1] === 216 ? '.jpg' : bytes[0] === 82 && bytes[1] === 73 && bytes[8] === 87 && bytes[9] === 69 ? '.webp' : '';
  if (!extension) throw new Error('Choose a JPEG, PNG or WebP image');
  const name = newId() + extension;
  new File(attachments, name).write(bytes);
  return name;
}
export function imageUri(name: string) { return new File(attachments, name).uri; }
async function checksum(bytes: Uint8Array): Promise<string> {
  const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(bytes));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
export async function createBackup(): Promise<File> {
  directories();
  const state = await snapshot();
  const images: Record<string, Uint8Array> = {};
  for (const name of new Set(state.payments.flatMap(p => p.images))) {
    const file = new File(attachments, name);
    if (!file.exists) throw new Error('A payment image is missing. Backup was not created.');
    images[name] = await file.bytes();
  }
  const encoded = await encodeBackup(state, images, checksum);
  const file = new File(backups, 'NMS-' + encoded.manifest.createdAt.replace(/[:.]/g, '-') + '.nms');
  const staged = new File(backups, newId() + '.partial');
  try {
    staged.write(encoded.bytes);
    await inspectBackup(staged.uri);
    // Both paths are in the same private folder. An interrupted write stays
    // outside the list of restorable .nms archives.
    await staged.move(file);
    return file;
  } catch (error) {
    try { if (staged.exists) staged.delete(); } catch { /* Preserve the original failure. */ }
    throw error;
  }
}
export async function inspectBackup(uri: string) {
  const archive = new File(uri);
  if (archive.size > 250_000_000) throw new Error('This backup exceeds the current 250 MB restore limit');
  return decodeBackup(await archive.bytes(), checksum);
}
export async function restoreBackup(uri: string): Promise<void> {
  const checked = await inspectBackup(uri);
  await createBackup();
  directories();
  // Use new names so a failed restore cannot overwrite a current payment's image.
  const renamed = new Map<string, string>();
  for (const payment of checked.state.payments) {
    payment.images = payment.images.map(name => {
      if (!renamed.has(name)) {
        const target = newId() + '.' + name.split('.').pop();
        new File(attachments, target).write(checked.files['images/' + name]);
        renamed.set(name, target);
      }
      return renamed.get(name)!;
    });
  }
  await restoreRegister(checked.state);
}
export function localBackups(): File[] {
  directories();
  return backups.list().filter((f): f is File => f instanceof File && f.name.endsWith('.nms')).sort((a, b) => b.name.localeCompare(a.name));
}
