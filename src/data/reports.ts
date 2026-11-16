import * as XLSX from 'xlsx';
import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import { money, monthLabel, type Register } from '../domain/model';
import { reportRows, type ReportSelection } from '../domain/reports';
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function reportData(state: Register, selection: ReportSelection) {
  const t = (en: string, ml: string) => state.language === 'ml' ? ml : en;
  const title = selection.type === 'master' ? t('Master list', 'പ്രധാന പട്ടിക') : t('Monthly dues', 'മാസ കുടിശ്ശിക');
  const scope = selection.scope === 'all' ? t('All households', 'എല്ലാ വീടുകളും') : (selection.scope === 'route' ? state.routes : state.boys).find(r => r.id === selection.scopeId)?.name ?? '';
  const headers = [t('Route', 'റൂട്ട്'), t('Stop', 'സ്ഥാനം'), t('Household', 'വീട്'), t('Papers', 'പത്രങ്ങൾ'), t('Delivery boy', 'വിതരണക്കാരൻ'),
    ...(selection.type === 'dues' ? [t('Original total (₹)', 'ആകെ ബിൽ (₹)'), t('Still due (₹)', 'ബാക്കി (₹)')] : [])];
  const rows = reportRows(state, selection);
  const values = rows.map(r => [r.route, r.position, r.name, r.papers, r.boy, ...(selection.type === 'dues' ? [r.original / 100, r.remaining / 100] : [])]);
  const total = rows.reduce((sum, r) => ({ original: sum.original + r.original, remaining: sum.remaining + r.remaining }), { original: 0, remaining: 0 });
  return { title, scope, headers, rows, values, total, month: monthLabel(selection.month, state.language), at: new Date().toLocaleString(state.language === 'ml' ? 'ml-IN' : 'en-IN') };
}
export function reportExcel(state: Register, selection: ReportSelection) {
  const data = reportData(state, selection); const book = XLSX.utils.book_new();
  const footer = selection.type === 'dues' ? [['Total', '', '', '', '', data.total.original / 100, data.total.remaining / 100]] : [];
  const sheet = XLSX.utils.aoa_to_sheet([[data.title, data.month, data.scope, data.at], [], data.headers, ...data.values, ...footer]);
  sheet['!cols'] = [20, 8, 28, 22, 20, 18, 18].map(wch => ({ wch }));
  XLSX.utils.book_append_sheet(book, sheet, 'NMS');
  const file = new File(Paths.cache, 'NMS-' + selection.type + '-' + selection.month + '.xlsx');
  file.write(new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }))); return file;
}
export function reportHtml(state: Register, selection: ReportSelection) {
  const data = reportData(state, selection);
  return '<!doctype html><html lang="' + state.language + '"><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font-family:sans-serif;color:#171A1D;font-size:10pt}h1{font-size:20pt}table{width:100%;border-collapse:collapse}th,td{padding:6px;border-bottom:1px solid #D9DEE5;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}th{background:#E8F0FF}tfoot{font-weight:bold}</style></head><body><h1>NMS · ' + escape(data.title) + '</h1><p>' + escape(data.month + ' · ' + data.scope + ' · ' + data.at) + '</p><table><thead><tr>' +
    data.headers.map(h => '<th>' + escape(h) + '</th>').join('') + '</tr></thead><tbody>' + data.values.map(row => '<tr>' + row.map(v => '<td>' + escape(String(v)) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' +
    (selection.type === 'dues' ? '<p>' + escape((state.language === 'ml' ? 'ആകെ ബിൽ: ' : 'Original total: ') + money(data.total.original) + ' · ' + (state.language === 'ml' ? 'ബാക്കി: ' : 'Still due: ') + money(data.total.remaining)) + '</p>' : '') + '</body></html>';
}
export async function reportPdf(state: Register, selection: ReportSelection) {
  return Print.printToFileAsync({ html: reportHtml(state, selection), width: 595, height: 842 });
}
