import { Directory, type File } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';

/** Export a copy into the Android folder chosen by the operator. */
export async function saveFileCopy(source: File, name: string, mimeType: string) {
  // SDK 57's modern folder picker can lose its activity registration in a
  // development client. The legacy picker uses Android's activity result directly.
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return;

  const folder = new Directory(permission.directoryUri);
  const destination = folder.createFile(name, mimeType);
  try {
    await source.readableStream().pipeTo(destination.writableStream());
  } catch (error) {
    try { destination.delete(); } catch { /* The provider may no longer be accessible. */ }
    throw error;
  }
  return destination.name;
}
