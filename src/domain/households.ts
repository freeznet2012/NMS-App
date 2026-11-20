import { monthlyItemsAt, profileAt, validMonth, type CustomBillItem, type HouseholdVersion, type Register } from './model';
function putVersion(state: Register, id: string, version: HouseholdVersion) {
  const household = state.households.find(h => h.id === id)!;
  household.versions = [...household.versions.filter(v => v.month !== version.month), version].sort((a, b) => a.month.localeCompare(b.month));
}
export function saveHousehold(state: Register, input: {
  id: string; phone: string; afterId: string; profile: HouseholdVersion; monthlyItems?: CustomBillItem[];
}) {
  const { id, phone, afterId, profile, monthlyItems } = input;
  if (!validMonth(profile.month) || !profile.name.trim()) throw new Error('Enter a name and valid effective month');
  if (!state.routes.some(r => r.id === profile.routeId) || !state.boys.some(b => b.id === profile.boyId)) throw new Error('Choose a route and delivery boy');
  const household = state.households.find(h => h.id === id) ?? { id, phone, versions: [] };
  const effectiveItems = monthlyItems ?? monthlyItemsAt(household, profile.month);
  if (profile.active && !profile.subscriptions.length && !effectiveItems.length) throw new Error('Choose a paper or add a monthly custom item');
  const oldRoute = profileAt(household, profile.month)?.routeId;
  if (!household.versions.length) state.households.push(household);
  household.phone = phone;
  putVersion(state, id, { ...profile, name: profile.name.trim() });
  if (monthlyItems !== undefined) {
    household.monthlyItems = [...(household.monthlyItems ?? []).filter(version => version.month !== profile.month),
      { month: profile.month, items: monthlyItems }].sort((left, right) => left.month.localeCompare(right.month));
  }
  for (const routeId of new Set([oldRoute, profile.routeId].filter(Boolean))) {
    const stops = state.households.filter(h => h.id !== id).map(h => ({ id: h.id, profile: profileAt(h, profile.month) }))
      .filter((h): h is { id: string; profile: HouseholdVersion } => !!h.profile && h.profile.routeId === routeId)
      .sort((a, b) => a.profile.position - b.profile.position);
    if (routeId === profile.routeId) {
      const afterIndex = afterId ? stops.findIndex(h => h.id === afterId) : -1;
      if (afterId && afterIndex < 0) throw new Error('The preceding household has moved. Choose its position again.');
      stops.splice(afterIndex + 1, 0, { id, profile });
    }
    stops.forEach((stop, index) => putVersion(state, stop.id, { ...stop.profile, month: profile.month, position: index + 1 }));
  }
}
