import { profileAt, validMonth, type HouseholdVersion, type Register } from './model';
function putVersion(state: Register, id: string, version: HouseholdVersion) {
  const household = state.households.find(h => h.id === id)!;
  household.versions = [...household.versions.filter(v => v.month !== version.month), version].sort((a, b) => a.month.localeCompare(b.month));
}
export function saveHousehold(state: Register, input: { id: string; phone: string; afterId: string; profile: HouseholdVersion }) {
  const { id, phone, afterId, profile } = input;
  if (!validMonth(profile.month) || !profile.name.trim()) throw new Error('Enter a name and valid effective month');
  if (!state.routes.some(r => r.id === profile.routeId) || !state.boys.some(b => b.id === profile.boyId)) throw new Error('Choose a route and delivery boy');
  if (profile.active && !profile.subscriptions.length) throw new Error('Choose at least one paper');
  const existing = state.households.find(h => h.id === id);
  const oldRoute = existing && profileAt(existing, profile.month)?.routeId;
  if (existing) { existing.phone = phone; putVersion(state, id, { ...profile, name: profile.name.trim() }); }
  else state.households.push({ id, phone, versions: [{ ...profile, name: profile.name.trim() }] });
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
