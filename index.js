// Register background work before Router mounts any screen. Android can start
// the JS runtime for a backup without opening the app's UI.
import './src/data/backup-schedule';
import 'expo-router/entry';
