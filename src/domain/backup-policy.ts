// A daily backup is due for the latest local 22:00 boundary. A daytime manual
// backup must not suppress that evening's snapshot of subsequent changes.
export function backupDue(updatedAt: string, latest: { createdAt: string; lastChanged: string } | undefined, now = new Date()): boolean {
  if (!latest) return true;
  if (latest.lastChanged === updatedAt) return false;
  const boundary = new Date(now);
  boundary.setHours(22, 0, 0, 0);
  if (now < boundary) boundary.setDate(boundary.getDate() - 1);
  const created = Date.parse(latest.createdAt);
  return !Number.isFinite(created) || created < boundary.getTime();
}
