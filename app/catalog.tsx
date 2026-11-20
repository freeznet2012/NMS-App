import { useLocalSearchParams } from 'expo-router';
import { NamedCatalogScreen } from '../src/screens/named-catalog';
import { PeriodicalsScreen } from '../src/screens/periodicals';

export default function CatalogScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  if (kind === 'routes' || kind === 'boys') return <NamedCatalogScreen key={kind} kind={kind} />;
  return <PeriodicalsScreen />;
}
