import { Redirect, useLocalSearchParams } from 'expo-router';
import { NamedCatalogEditor } from '../src/screens/named-catalog';

export default function CatalogEntryScreen() {
  const { kind, id } = useLocalSearchParams<{ kind?: string; id?: string }>();
  if (kind !== 'routes' && kind !== 'boys') return <Redirect href="/manage" />;
  return <NamedCatalogEditor key={kind + ':' + (id ?? '')} kind={kind} id={id} />;
}
