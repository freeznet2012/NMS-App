export type Month = string;
export type Language = 'en' | 'ml';
export interface NamedRecord { id: string; name: string }
export interface Rate { month: Month; amount: number }
export interface Periodical extends NamedRecord { code: string; rates: Rate[] }
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
export interface Household { id: string; phone: string; versions: HouseholdVersion[] }
export interface BillLine { periodicalId: string; code: string; quantity: number; rate: number; deduction: number; missedDays?: number }
export interface Carry { billId: string; amount: number }
export interface Bill {
  id: string; customerId: string; month: Month; name: string; routeId: string;
  boyId: string; position: number; lines: BillLine[]; opening?: number; carry: Carry[];
}
export interface Payment {
  id: string; customerId: string; amount: number; targetMonth?: Month;
  creditAfter: Month; method?: 'cash' | 'upi'; collectedOn?: string;
  images: string[]; enteredAt: string; updatedAt: string;
}
export interface WriteOff { id: string; billId: string; amount: number; reason: string; enteredAt: string }
export interface Activity { id: string; at: string; action: string; customerId?: string; name?: string; route?: string; amount?: number }
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
export function billCharge(bill: Bill): number {
  return bill.opening ?? bill.lines.reduce((sum, line) => sum + line.quantity * line.rate - line.deduction, 0);
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
