import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  DEFAULT_PREFERENCE,
  disableNotifications,
  enableNotifications,
  readNotificationPreference,
  type NotificationPreference,
} from '../services/notifications';

const stateLabels: Record<NotificationPreference['permission'], string> = {
  'not-requested': 'Not requested',
  granted: 'Allowed',
  denied: 'Blocked in browser',
  unsupported: 'Not supported',
  error: 'Configuration error',
};

export const NotificationSettings: React.FC<{ user: User }> = ({ user }) => {
  const [preference, setPreference] = useState(DEFAULT_PREFERENCE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    readNotificationPreference(user)
      .then((value) => { if (active) setPreference(value); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load notification settings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const toggle = async () => {
    setLoading(true);
    setError(null);
    try {
      setPreference(preference.enabled ? await disableNotifications(user) : await enableNotifications(user));
    } catch (reason) {
      // Device/token provisioning may fail after the Learnendo preference was
      // persisted. Reload the durable preference instead of presenting it as
      // disabled locally.
      try {
        setPreference(await readNotificationPreference(user));
      } catch {
        setPreference((current) => ({ ...current, permission: 'error' }));
      }
      setError(reason instanceof Error ? reason.message : 'Unable to change notification settings.');
    } finally {
      setLoading(false);
    }
  };

  const blocked = preference.permission === 'denied' || preference.permission === 'unsupported';
  return (
    <div className="min-h-screen bg-slate-900 px-4 py-10 text-slate-100">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Settings</p>
        <h1 className="mt-2 text-2xl font-black">Ative as notificações do Learnendo</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Receba lembretes da sua trilha e acompanhe seu progresso de estudos.
          Você pode desativar os lembretes aqui a qualquer momento.
        </p>
        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-slate-900/70 p-4">
          <div>
            <p className="font-bold">Push notifications</p>
            <p className="mt-1 text-xs text-slate-400">Browser status: {stateLabels[preference.permission]}</p>
          </div>
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={loading || blocked}
            className={`rounded-xl px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 ${preference.enabled ? 'bg-slate-600' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            {loading ? 'Carregando...' : preference.enabled ? 'Desativar' : 'Ativar notificações'}
          </button>
        </div>
        {preference.permission === 'denied' && (
          <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            Notifications are blocked in this browser. Open the site permissions in your browser to allow them.
          </p>
        )}
        {preference.permission === 'unsupported' && (
          <p className="mt-4 rounded-xl border border-slate-600 bg-slate-900/60 p-3 text-sm text-slate-300">
            This browser or browsing mode does not support web push notifications.
          </p>
        )}
        {error && <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      </section>
    </div>
  );
};
