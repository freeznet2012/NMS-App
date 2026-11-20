export type Month = string;
export type Language = 'en' | 'ml';
export const maxStoredAmount = 1_000_000_000;
export const latestRegisterFileVersion = 5;
export interface NamedRecord { id: string; name: string }
export interface Rate { month: Month; amount: number }
export interface Periodical extends NamedRecord { code: string; rates: Rate[]; inactive?: true }
export interface Subscription { periodicalId: string; quantity: number; specialRate?: number; specialSince?: Month }
export interface HouseholdVersion {
  month: Month;
  name: string;
  routeId: string;
  boyId: string;
  position: number;
  active: boolean;
  subscriptions: Subscription[];
}
export interface CustomBillItem extends NamedRecord { amount: number }
export interface BillCustomItem extends CustomBillItem { recurring?: true }
export interface MonthlyItems { month: Month; items: CustomBillItem[] }
export interface Household { id: string; phone: string; versions: HouseholdVersion[]; monthlyItems?: MonthlyItems[] }
export interface BillLine { periodicalId: string; code: string; quantity: number; rate: number; deduction: number; missedDays?: number }
export interface Carry { billId: string; amount: number }
export interface Bill {
  id: string; customerId: string; month: Month; name: string; routeId: string;
  boyId: string; position: number; lines: BillLine[]; opening?: number; carry: Carry[];
  customItems?: BillCustomItem[];
  preparedTotal?: number;
}
export type PaymentMethod = 'cash' | 'upi' | 'split';
export interface PaymentSplit { cash: number; upi: number }
export interface Payment {
  id: string; customerId: string; amount: number; targetMonth?: Month;
  creditAfter: Month; method?: PaymentMethod; split?: PaymentSplit; collectedOn?: string;
  images: string[]; enteredAt: string; updatedAt: string;
}
export interface WriteOff { id: string; billId: string; amount: number; reason: string; enteredAt: string }
export interface BillCorrection { billId: string; item?: string; before: number; after: number }
export interface Activity {
  id: string; at: string; action: string; customerId?: string; name?: string; route?: string; amount?: number;
  correction?: BillCorrection; paymentId?: string;
}
export interface Register {
  schema: 1; language: Language; started: boolean; firstMonth: Month;
  routes: NamedRecord[]; boys: NamedRecord[]; periodicals: Periodical[];
  households: Household[]; bills: Bill[]; payments: Payment[]; writeOffs: WriteOff[];
  activity: Activity[]; imports: string[]; updatedAt: string;
}
export function lastCompletedMonth(now = new Date()): Month {
  return monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}
export function monthKey(date: Date): Month {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
export function validMonth(value: string): boolean { return /^\d{4}-(0[1-9]|1[0-2])$/.test(value); }
export function emptyRegister(): Register {
  return { schema: 1, language: 'en', started: false, firstMonth: lastCompletedMonth(),
    routes: [], boys: [], periodicals: [], households: [], bills: [], payments: [],
    writeOffs: [], activity: [], imports: [], updatedAt: new Date().toISOString() };
}
export function profileAt(household: Household, month: Month): HouseholdVersion | undefined {
  return [...household.versions].sort((a, b) => b.month.localeCompare(a.month)).find(v => v.month <= month);
}
export function currentProfile(household: Household): HouseholdVersion {
  return profileAt(household, monthKey(new Date())) ?? household.versions[0];
}
export function monthlyItemsAt(household: Household, month: Month): CustomBillItem[] {
  const schedule = household.monthlyItems ?? [];
  const effective = schedule.reduce<MonthlyItems | undefined>((prior, version) =>
    version.month <= month && (!prior || version.month > prior.month) ? version : prior, undefined);
  return effective?.items ?? [];
}
export function withCopyCount(label: string, quantity: number): string {
  return quantity > 1 ? label + ' × ' + quantity : label;
}
export function billCharge(bill: Bill): number {
  return bill.opening ?? bill.lines.reduce((sum, line) => sum + billLineCharge(line), 0) +
    (bill.customItems ?? []).reduce((sum, item) => sum + item.amount, 0);
}
export function billLineCharge(line: BillLine): number {
  return line.quantity * line.rate - line.deduction;
}
export function rateAt(periodical: Periodical, month: Month): Rate | undefined {
  return [...periodical.rates].sort((a, b) => b.month.localeCompare(a.month)).find(rate => rate.month <= month);
}
// Older apps reject this version before discarding fields they cannot read.
export function registerFileVersion(state: Register): 1 | 2 | 3 | 4 | 5 {
  if (state.periodicals.some(paper => paper.inactive) || state.activity.some(entry => entry.paymentId)) return 5;
  if (state.payments.some(payment => payment.method === 'split')) return 4;
  if (state.households.some(household => household.monthlyItems !== undefined) ||
    state.bills.some(bill => bill.customItems?.some(item => item.recurring))) return 3;
  return state.bills.some(bill => bill.preparedTotal !== undefined || bill.customItems !== undefined) ||
    state.activity.some(entry => entry.correction !== undefined) ? 2 : 1;
}
export function money(value: number): string {
  return '₹' + (value / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
export function parseMoney(value: string): number {
  const normalized = value.replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Enter a valid amount');
  const amount = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(amount)) throw new Error('Amount is too large');
  return amount;
}
export function monthLabel(month: Month, language: Language = 'en'): string {
  if (!validMonth(month)) return month;
  const [year, number] = month.split('-').map(Number);
  return new Date(year, number - 1, 1).toLocaleDateString(language === 'ml' ? 'ml-IN' : 'en-IN', { month: 'long', year: 'numeric' });
}
