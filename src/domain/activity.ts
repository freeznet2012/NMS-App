import { monthKey, type Activity } from './model';

export type ActivityKind = 'payments' | 'bills' | 'households' | 'imports' | 'other';
export type ActivityRange = 'all' | 'today' | 'yesterday' | 'week' | 'month';

export function activityKind(activity: Activity): ActivityKind {
  const { action } = activity;
  if (action === 'Recorded payment' || action === 'Deleted payment') return 'payments';
  if (activity.correction || action === 'Corrected bill' || action === 'Wrote off dues') return 'bills';
  if (action === 'Added household' || action === 'Updated household') return 'households';
  if (/^Imported \d+ households?$/.test(action)) return 'imports';
  return 'other';
}

export function activityDay(date: Date): string {
  return monthKey(date) + '-' + String(date.getDate()).padStart(2, '0');
}

export function dayBefore(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);
}

export function groupActivity(entries: Activity[], category: ActivityKind | 'all', range: ActivityRange, now = new Date()) {
  const today = activityDay(now);
  const start = range === 'all' ? '' :
    activityDay(dayBefore(now, range === 'today' ? 0 : range === 'yesterday' ? 1 : range === 'week' ? 6 : 29));
  const end = range === 'yesterday' ? start : today;
  const groups = new Map<string, { day: string; date: Date; data: Activity[] }>();
  const ordered = [...entries].reverse().sort((left, right) => Date.parse(right.at) - Date.parse(left.at));
  for (const entry of ordered) {
    if (category !== 'all' && activityKind(entry) !== category) continue;
    const date = new Date(entry.at);
    const day = activityDay(date);
    if (range !== 'all' && (day < start || day > end)) continue;
    const group = groups.get(day);
    if (group) group.data.push(entry);
    else groups.set(day, { day, date, data: [entry] });
  }
  return [...groups.values()];
}
