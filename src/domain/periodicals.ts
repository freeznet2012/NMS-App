import { maxStoredAmount, rateAt, validMonth, type Periodical, type Register } from './model';

export type PeriodicalSort = 'name' | 'nameDesc' | 'code';

export function searchPeriodicals(papers: Periodical[], query: string, sort: PeriodicalSort, locale: string): Periodical[] {
  const match = query.trim().normalize('NFC').toLocaleLowerCase();
  const compare = new Intl.Collator(locale, { sensitivity: 'base', numeric: true }).compare;
  return papers.filter(paper => (paper.name + ' ' + paper.code).normalize('NFC').toLocaleLowerCase().includes(match))
    .sort((left, right) => sort === 'code' ? compare(left.code, right.code) :
      (sort === 'nameDesc' ? -1 : 1) * (compare(left.name, right.name) || compare(left.code, right.code)));
}

export function savePeriodical(state: Register, input: {
  id: string; name: string; code: string; month: string; amount: number; inactive: boolean;
}): void {
  const { id, month, amount, inactive } = input;
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const paper = state.periodicals.find(entry => entry.id === id);
  if (!name || name.length > 200) throw new Error('Enter a periodical name.');
  if (!/^[A-Z]{2,4}$/.test(code) && paper?.code.toUpperCase() !== code) throw new Error('Use a code of 2–4 letters.');
  if (state.periodicals.some(entry => entry.id !== id && entry.code.toUpperCase() === code)) throw new Error('That short code is already in use.');
  if (!validMonth(month) || !Number.isInteger(amount) || amount < 0 || amount > maxStoredAmount) {
    throw new Error('Enter a valid monthly price and month.');
  }
  if (!paper) {
    state.periodicals.push({ id, name, code, rates: [{ month, amount }], ...(inactive ? { inactive: true } : {}) });
    return;
  }
  paper.name = name;
  paper.code = code;
  if (inactive) paper.inactive = true;
  else delete paper.inactive;
  if (rateAt(paper, month)?.amount !== amount) {
    paper.rates = [...paper.rates.filter(rate => rate.month !== month), { month, amount }];
  }
}
