import * as XLSX from 'xlsx';
import { currentProfile, parseMoney, validMonth, type Register, type Periodical } from './model';
export interface ImportRow {
  row: number; name: string; route: string; boy: string; phone: string; codes: string[];
  pending: { month: string; amount: number }[]; errors: string[]; possibleDuplicate: boolean; include: boolean;
}
export interface ImportPreview { hash: string; name: string; papers: Periodical[]; rows: ImportRow[]; repeated: boolean }
export function parseWorkbook(bytes: Uint8Array, state: Register, firstMonth: string, hash: string, filename: string, id: () => string): ImportPreview {
  if (!validMonth(firstMonth)) throw new Error('Choose a valid first billing month');
  const book = XLSX.read(bytes, { type: 'array' });
  if (!book.Sheets.Customers || !book.Sheets.Periodicals) throw new Error('Use the template with Customers and Periodicals sheets');
  const catalog = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets.Periodicals, { defval: '' });
  const papers: Periodical[] = [];
  for (const row of catalog) {
    const code = String(row.Code ?? '').trim().toUpperCase();
    const name = String(row.Name ?? '').trim();
    if (!code || !name) throw new Error('Each periodical needs a code and name');
    if (papers.some(p => p.code === code)) throw new Error('Repeated periodical code: ' + code);
    const amount = parseMoney(String(row['Monthly price (₹)']));
    const existing = state.periodicals.find(p => p.code === code);
    if (existing) {
      const rate = [...existing.rates].sort((a, b) => b.month.localeCompare(a.month)).find(r => r.month <= firstMonth);
      if (rate?.amount !== amount) throw new Error('Price conflict for ' + code + '. Change its price in Periodicals first.');
    }
    papers.push(existing ?? { id: id(), code, name, rates: [{ month: firstMonth, amount }] });
  }
  const source = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets.Customers, { defval: '', raw: false });
  if (source.length > 5000) throw new Error('Please import at most 5,000 households at a time');
  const rows: ImportRow[] = source.map((raw, i) => {
    const name = String(raw.Household ?? '').trim();
    const route = String(raw.Route ?? '').trim();
    const boy = String(raw['Delivery boy'] ?? '').trim();
    const codes = String(raw.Periodicals ?? '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
    const errors: string[] = [];
    if (!name || !route || !boy) errors.push('Household, route, and delivery boy are required');
    if (!codes.length) errors.push('Add at least one periodical');
    for (const code of codes) if (!papers.some(p => p.code === code)) errors.push('Unknown code: ' + code);
    const pending: ImportRow['pending'] = [];
    for (const [key, value] of Object.entries(raw)) {
      if (!key.endsWith(' pending (₹)') || String(value).trim() === '') continue;
      const month = key.slice(0, 7);
      try {
        if (!validMonth(month) || month >= firstMonth) throw new Error('Opening dues must precede the first billing month');
        const amount = parseMoney(String(value));
        if (amount) pending.push({ month, amount });
      } catch (error) { errors.push(key + ': ' + (error as Error).message); }
    }
    const possibleDuplicate = state.households.some(h => {
      const p = currentProfile(h);
      return p.name.toLocaleLowerCase() === name.toLocaleLowerCase() &&
        state.routes.find(r => r.id === p.routeId)?.name.toLocaleLowerCase() === route.toLocaleLowerCase();
    }) || source.slice(0, i).some(r => String(r.Household).trim().toLocaleLowerCase() === name.toLocaleLowerCase() &&
      String(r.Route).trim().toLocaleLowerCase() === route.toLocaleLowerCase());
    return { row: i + 2, name, route, boy, phone: String(raw.Phone ?? ''), codes, pending, errors, possibleDuplicate, include: !errors.length && !possibleDuplicate };
  });
  return { hash, name: filename, papers, rows, repeated: state.imports.includes(hash) };
}
export function applyImport(state: Register, preview: ImportPreview, firstMonth: string, id: () => string): void {
  if (preview.repeated) throw new Error('This workbook has already been imported');
  const rows = preview.rows.filter(r => r.include);
  if (!rows.length || rows.some(r => r.errors.length)) throw new Error('Choose valid rows to import');
    if (state.imports.includes(preview.hash)) throw new Error('This workbook has already been imported');
    if (!state.started) state.firstMonth = firstMonth;
    for (const paper of preview.papers) if (!state.periodicals.some(p => p.id === paper.id)) state.periodicals.push(paper);
    for (const row of rows) {
      let route = state.routes.find(r => r.name.toLocaleLowerCase() === row.route.toLocaleLowerCase());
      if (!route) { route = { id: id(), name: row.route }; state.routes.push(route); }
      let boy = state.boys.find(b => b.name.toLocaleLowerCase() === row.boy.toLocaleLowerCase());
      if (!boy) { boy = { id: id(), name: row.boy }; state.boys.push(boy); }
      const position = Math.max(0, ...state.households.map(currentProfile).filter(p => p.routeId === route.id).map(p => p.position)) + 1;
      const customerId = id();
      const quantities = new Map<string, number>();
      for (const code of row.codes) quantities.set(code, (quantities.get(code) ?? 0) + 1);
      state.households.push({ id: customerId, phone: row.phone, versions: [{ month: firstMonth, name: row.name,
        routeId: route.id, boyId: boy.id, position, active: true,
        subscriptions: [...quantities].map(([code, quantity]) => ({ periodicalId: state.periodicals.find(p => p.code === code)!.id, quantity })) }] });
      for (const due of row.pending) state.bills.push({ id: id(), customerId, month: due.month, name: row.name,
        routeId: route.id, boyId: boy.id, position, lines: [], carry: [], opening: due.amount });
    }
    state.started = true;
    state.imports.push(preview.hash);
}
