import React, { useEffect, useState } from 'react';
import type { LiveClass } from '../../types';
import { isPersistentScreenSharing, subscribePersistentLiveMedia, togglePersistentScreenShare } from '../../services/persistentLiveMedia';

export function GlobalLiveShareButton({ liveClass }: { liveClass: LiveClass }) {
  const [sharing, setSharing] = useState(() => isPersistentScreenSharing(liveClass.id));
  const [error, setError] = useState('');
  useEffect(() => subscribePersistentLiveMedia(() => setSharing(isPersistentScreenSharing(liveClass.id))), [liveClass.id]);
  return <button type="button"
    onClick={() => void togglePersistentScreenShare(liveClass.id).then(() => setError('')).catch(() => setError('Abra a sala da Live uma vez para conectar o Share.'))}
    className={`fixed bottom-24 right-4 z-[14000] rounded-full px-4 py-3 text-xs font-black shadow-2xl ${sharing ? 'bg-emerald-500 text-slate-950' : 'bg-cyan-500 text-slate-950'}`}
    title={error || (sharing ? 'Parar compartilhamento global' : 'Compartilhar tela na Live')}
    aria-label={sharing ? 'Parar compartilhamento global' : 'Compartilhar tela na Live'}>
    {sharing ? 'Stop Share' : 'Share'}
  </button>;
}
