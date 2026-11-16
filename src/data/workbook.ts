import * as XLSX from 'xlsx';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { type Register } from '../domain/model';
import { parseWorkbook, applyImport, type ImportPreview } from '../domain/import';
import { changeRegister, newId } from './store';
export type { ImportPreview } from '../domain/import';
export async function readWorkbook(uri: string, state: Register, firstMonth: string): Promise<ImportPreview> {
  const file = new File(uri);
  if (file.size > 10_000_000) throw new Error('Please import a workbook smaller than 10 MB');
  const bytes = await file.bytes();
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(bytes));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  return parseWorkbook(bytes, state, firstMonth, hash, file.name, newId);
}
export async function commitImport(preview: ImportPreview, firstMonth: string): Promise<void> {
  await changeRegister(state => applyImport(state, preview, firstMonth, newId), { action: 'Imported ' + preview.rows.filter(r => r.include).length + ' households' });
}
export function templateFile(): File {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['Code', 'Name', 'Monthly price (₹)'], ['MM', 'Malayala Manorama', 300], ['MB', 'Mathrubhumi', 300],
  ]), 'Periodicals');
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['Household', 'Route', 'Delivery boy', 'Phone', 'Periodicals'],
  ]), 'Customers');
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['Instructions'], ['Replace the example periodical prices with your own.'],
    ['One household per row, in walking order within each route.'],
    ['Repeat codes for multiple copies, for example MM, MM, MB.'],
    ['Optional opening balance headings use YYYY-MM pending (₹), for example 2026-05 pending (₹).'],
    ['Opening dues must be earlier than your first NMS billing month.'],
  ]), 'Instructions');
  const file = new File(Paths.cache, 'NMS-import-template.xlsx');
  file.write(new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' })));
  return file;
}
