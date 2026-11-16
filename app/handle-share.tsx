import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { keepImage } from '../src/data/backup';
import { useRegister } from '../src/data/store';
import { Button, ErrorText, Label, Screen, useWords } from '../src/components/ui';
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
  const state = useRegister(); const t = useWords(); const { event } = useLocalSearchParams<{ event?: string }>(); const [error, setError] = useState('');
  useEffect(() => { let live = true; if (!state.started) return;
    receiveImages().then(images => { if (live) router.replace({ pathname: '/customers', params: { images: JSON.stringify(images) } }); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [event, state.started]);
  return <Screen title={t('Payment image', 'പണമടവ് ചിത്രം')} back><Label>{state.started ? t('Opening image…', 'ചിത്രം തുറക്കുന്നു…') : t('Start or restore a register before recording a payment.', 'പണം രേഖപ്പെടുത്തുന്നതിന് മുൻപ് രജിസ്റ്റർ തുടങ്ങുകയോ പുനഃസ്ഥാപിക്കുകയോ ചെയ്യുക.')}</Label>
    <ErrorText message={error} /><Button secondary title={t('Return to register', 'രജിസ്റ്ററിലേക്ക് മടങ്ങുക')} onPress={() => router.replace('/')} /></Screen>;
}
