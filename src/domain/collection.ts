import { currentProfile, type Register } from './model';
import { ledger, remainingForBill } from './billing';
export function collectionRows(state: Register, month: string) {
  return state.households.map(household => {
    const profile = currentProfile(household);
    const bill = state.bills.find(b => b.customerId === household.id && b.month === month);
    return { household, profile, bill, remaining: bill ? remainingForBill(bill, ledger(state, household.id)) : 0 };
  }).filter(row => row.bill).sort((a, b) => a.profile.position - b.profile.position);
}
export function filterCollection(rows: ReturnType<typeof collectionRows>, filters: { routeId: string; boyId: string; query: string; status: string }) {
  const query = filters.query.trim().toLocaleLowerCase();
  return rows.filter(r => r.profile.routeId === filters.routeId && (!filters.boyId || r.profile.boyId === filters.boyId) &&
    (query ? r.profile.name.toLocaleLowerCase().includes(query) : filters.status === 'all' || (filters.status === 'unpaid' ? r.remaining > 0 : r.remaining === 0)));
}
