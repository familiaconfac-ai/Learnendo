import type { LiveClassSession } from '../types';

export const LIVE_MEDIA_GRACE_PERIOD_MS = 10_000;
export const LIVE_MEDIA_PARTICIPANT_STALE_MS = 20_000;

export type LiveMediaTransport = NonNullable<LiveClassSession['mediaTransport']>;

export function normalizeMediaTransport(value: unknown): LiveMediaTransport {
  if (value === 'livekit-connecting' || value === 'connecting') return 'livekit-connecting';
  if (value === 'livekit-active' || value === 'connected') return 'livekit-active';
  if (value === 'meet') return 'meet';
  return 'none';
}

export function isLiveMediaActive(session: Pick<
  LiveClassSession,
  'teacherLiveMicEnabled' | 'teacherCameraEnabled' | 'teacherScreenShareEnabled' | 'anyStudentMediaActive'
>): boolean {
  return Boolean(
    session.teacherLiveMicEnabled
    || session.teacherCameraEnabled
    || session.teacherScreenShareEnabled
    || session.anyStudentMediaActive,
  );
}

export function shouldConnectForTransport(transport: LiveClassSession['mediaTransport']): boolean {
  return transport === 'livekit-connecting' || transport === 'livekit-active';
}

export function hasGracePeriodExpired(idleSince: string | null | undefined, now = Date.now()): boolean {
  if (!idleSince) return false;
  const startedAt = Date.parse(idleSince);
  return Number.isFinite(startedAt) && now - startedAt >= LIVE_MEDIA_GRACE_PERIOD_MS;
}
