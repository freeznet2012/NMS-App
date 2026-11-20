import { money, profileAt, withCopyCount, type Register } from './model';
import { ledger, originalTotal, remainingForBill } from './billing';
export interface ReportSelection { month: string; type: 'master' | 'dues'; scope: 'all' | 'route' | 'boy'; scopeId: string }
export function reportRows(state: Register, selection: ReportSelection) {
  return state.households.flatMap(h => {
    const bill = state.bills.find(b => b.customerId === h.id && b.month === selection.month);
    const household = profileAt(h, selection.month);
    const profile = bill ?? household;
    if (!profile || (selection.scope === 'route' && profile.routeId !== selection.scopeId) || (selection.scope === 'boy' && profile.boyId !== selection.scopeId)) return [];
    if (selection.type === 'dues' && !bill) return [];
    const paperText = selection.type === 'dues' && bill
      ? [...bill.lines.map(line => withCopyCount(line.code, line.quantity)),
        ...(bill.customItems ?? []).map(item => item.name + ' (' + money(item.amount) + ')')].join(', ')
      : (household?.active ? household.subscriptions : []).map(subscription =>
        withCopyCount(state.periodicals.find(paper => paper.id === subscription.periodicalId)!.code, subscription.quantity)).join(', ');
    return [{ customerId: h.id, name: profile.name, routeId: profile.routeId, route: state.routes.find(r => r.id === profile.routeId)!.name,
      boy: state.boys.find(b => b.id === profile.boyId)!.name, position: profile.position, papers: paperText,
      original: bill ? originalTotal(bill) : 0, remaining: bill ? remainingForBill(bill, ledger(state, h.id)) : 0 }];
  }).sort((a, b) => a.route.localeCompare(b.route) || a.position - b.position);
}
