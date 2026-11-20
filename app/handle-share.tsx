import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { keepImage } from '../src/data/backup';
import { useRegister } from '../src/data/store';
import { Button, ErrorText, Label, Screen, useWords } from '../src/components/ui';
import { CustomerPicker } from '../src/screens/customer-picker';
let pending: Promise<string[]> | undefined;
async function receiveImages() {
  return pending ??= (async () => {
    const payloads = Sharing.getSharedPayloads();
    if (!payloads.length || payloads.some(p => p.shareType !== 'image' && !p.mimeType?.startsWith('image/'))) throw new Error('Share an image to record a payment');
    const resolved = await Sharing.getResolvedSharedPayloadsAsync(); const images: string[] = [];
    for (const p of resolved) if (p.contentType === 'image' && p.contentUri) images.push(await keepImage(p.contentUri));
    if (!images.length) throw new Error('No readable payment image was received');
    Sharing.clearSharedPayloads(); return images;
  })().finally(() => { pending = undefined; });
}
export default function HandleShare() {
  const state = useRegister();
  const t = useWords();
  const { event } = useLocalSearchParams<{ event?: string }>();
  const [received, setReceived] = useState<{ event?: string; images: string[] }>();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state.started) return;
    let live = true;
    setError('');
    receiveImages().then(images => {
      if (live) setReceived({ event, images });
    }).catch(e => {
      if (live) setError(e.message);
    });
    return () => { live = false; };
  }, [event, state.started]);

  if (state.started && received && received.event === event) {
    return <CustomerPicker key={event} forPayment onSelect={id => {
      router.push({ pathname: '/payment', params: { id, images: JSON.stringify(received.images) } });
    }} />;
  }

  return <Screen title={t('Payment image', 'പണമടവ് ചിത്രം')} back><Label>{error ? t('Could not open the payment image.', 'പണമടവ് ചിത്രം തുറക്കാൻ കഴിഞ്ഞില്ല.') : state.started ? t('Opening image…', 'ചിത്രം തുറക്കുന്നു…') : t('Start or restore a register before recording a payment.', 'പണം രേഖപ്പെടുത്തുന്നതിന് മുൻപ് രജിസ്റ്റർ തുടങ്ങുകയോ പുനഃസ്ഥാപിക്കുകയോ ചെയ്യുക.')}</Label>
    <ErrorText message={error} /><Button secondary title={t('Return to register', 'രജിസ്റ്ററിലേക്ക് മടങ്ങുക')} onPress={() => router.replace('/')} /></Screen>;
}
