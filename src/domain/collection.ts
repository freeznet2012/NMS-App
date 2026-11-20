import { billCharge, currentProfile, type Register } from './model';
import { ledger, originalTotal, remainingForBill } from './billing';

export type CollectionStatus = 'unpaid' | 'paid' | 'all';

export function collectionRows(state: Register, month: string) {
  const billsForMonth = new Map(state.bills.filter(bill => bill.month === month).map(bill => [bill.customerId, bill]));
  const charges = new Map(state.bills.map(bill => [bill.id, billCharge(bill)]));
  return state.households.flatMap(household => {
    const bill = billsForMonth.get(household.id);
    if (!bill) return [];
    const profile = currentProfile(household);
    const balances = ledger(state, household.id);
    const paidByBill = new Map<string, number>();
    for (const allocations of Object.values(balances.allocations)) {
      for (const { billId, amount } of allocations) {
        paidByBill.set(billId, (paidByBill.get(billId) ?? 0) + amount);
      }
    }
    let collected = paidByBill.get(bill.id) ?? 0;
    for (const carry of bill.carry) {
      // Count only actual allocations within the amount carried on this bill.
      const outsideCarry = Math.max(0, (charges.get(carry.billId) ?? carry.amount) - carry.amount);
      collected += Math.max(0, (paidByBill.get(carry.billId) ?? 0) - outsideCarry);
    }
    return [{ household, profile, bill, original: originalTotal(bill), collected,
      remaining: remainingForBill(bill, balances) }];
  }).sort((a, b) => a.profile.position - b.profile.position);
}

type CollectionRows = ReturnType<typeof collectionRows>;

export function filterCollection(rows: CollectionRows, filters: { routeId: string; boyId: string; query: string; status: CollectionStatus }) {
  const query = filters.query.trim().normalize('NFC').toLocaleLowerCase();
  return rows.filter(r => r.profile.routeId === filters.routeId && (!filters.boyId || r.profile.boyId === filters.boyId) &&
    (query ? r.profile.name.normalize('NFC').toLocaleLowerCase().includes(query) : filters.status === 'all' || (filters.status === 'unpaid' ? r.remaining > 0 : r.remaining === 0)));
}

export function summarizeRouteCollection(rows: CollectionRows) {
  const counts = { unpaid: 0, paid: 0, all: rows.length };
  const amounts = { unpaid: 0, paid: 0, all: 0 };
  for (const row of rows) {
    amounts.all += row.original;
    if (row.remaining > 0) {
      counts.unpaid++;
      amounts.unpaid += row.remaining;
    } else {
      counts.paid++;
      amounts.paid += row.collected;
    }
  }
  return { counts, amounts };
}

export function summarizeCollections(rows: CollectionRows, routes: Register['routes']) {
  const byRoute = new Map(routes.map(route => [route.id, { unpaid: 0, outstanding: 0 }]));
  const total = { unpaid: 0, outstanding: 0 };
  for (const row of rows) {
    const summary = byRoute.get(row.profile.routeId);
    if (!summary || row.remaining <= 0) continue;
    summary.unpaid++;
    summary.outstanding += row.remaining;
    total.unpaid++;
    total.outstanding += row.remaining;
  }
  return { byRoute, total };
}
