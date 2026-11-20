import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import type { Register } from '../domain/model';
import type { ReportSelection } from '../domain/reports';
import { reportExcelBytes, reportHtml } from '../domain/report-format';
export { reportData, reportHtml } from '../domain/report-format';
export function reportExcel(state: Register, selection: ReportSelection) {
  const file = new File(Paths.cache, 'NMS-' + selection.type + '-' + selection.month + '.xlsx');
  file.write(reportExcelBytes(state, selection)); return file;
}
export async function reportPdf(state: Register, selection: ReportSelection) {
  return Print.printToFileAsync({ html: reportHtml(state, selection), width: 595, height: 842 });
}
