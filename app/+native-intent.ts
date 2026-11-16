export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try { return new URL(path).hostname === 'expo-sharing' ? '/handle-share?event=' + Date.now() : path; }
  catch { return '/'; }
}
