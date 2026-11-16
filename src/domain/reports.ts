import { profileAt, type Register } from './model';
import { ledger, originalTotal, remainingForBill } from './billing';
export interface ReportSelection { month: string; type: 'master' | 'dues'; scope: 'all' | 'route' | 'boy'; scopeId: string }
export function reportRows(state: Register, selection: ReportSelection) {
  return state.households.flatMap(h => {
    const bill = state.bills.find(b => b.customerId === h.id && b.month === selection.month);
    const profile = bill ?? profileAt(h, selection.month);
    if (!profile || (selection.scope === 'route' && profile.routeId !== selection.scopeId) || (selection.scope === 'boy' && profile.boyId !== selection.scopeId)) return [];
    if (selection.type === 'dues' && !bill) return [];
    const paperText = bill ? bill.lines.map(l => l.code + (l.quantity > 1 ? ' ×' + l.quantity : '')).join(', ') :
      profileAt(h, selection.month)!.subscriptions.map(s => state.periodicals.find(p => p.id === s.periodicalId)!.code + (s.quantity > 1 ? ' ×' + s.quantity : '')).join(', ');
    return [{ customerId: h.id, name: profile.name, routeId: profile.routeId, route: state.routes.find(r => r.id === profile.routeId)!.name,
      boy: state.boys.find(b => b.id === profile.boyId)!.name, position: profile.position, papers: paperText,
      original: bill ? originalTotal(bill) : 0, remaining: bill ? remainingForBill(bill, ledger(state, h.id)) : 0 }];
  }).sort((a, b) => a.route.localeCompare(b.route) || a.position - b.position);
}
