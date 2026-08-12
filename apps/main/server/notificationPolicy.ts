import { createHash } from 'node:crypto';

export const NOTIFICATION_TIMEZONE = 'America/Sao_Paulo';

export function notificationEventDocumentId(eventKey: string) {
  return createHash('sha256').update(eventKey).digest('hex');
}

export function safeInternalNotificationUrl(path: string, configuredOrigin?: string) {
  const origin = (configuredOrigin?.trim() || 'https://learnendo.vercel.app').replace(/\/$/, '');
  const base = new URL(origin);
  try {
    const target = new URL(path || '/', base);
    return target.origin === base.origin && (target.protocol === 'https:' || target.protocol === 'http:')
      ? target.href
      : new URL('/', base).href;
  } catch {
    return new URL('/', base).href;
  }
}

export function saoPauloDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: NOTIFICATION_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}
