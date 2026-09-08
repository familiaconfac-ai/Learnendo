import { ConnectionState, Room, RoomEvent, Track } from 'livekit-client';

let active: { classId: string; room: Room } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function getPersistentTeacherRoom(classId: string): Room {
  if (active?.classId === classId) return active.room;
  active?.room.disconnect();
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
  });
  room.on(RoomEvent.LocalTrackPublished, emit);
  room.on(RoomEvent.LocalTrackUnpublished, emit);
  room.on(RoomEvent.Disconnected, emit);
  active = { classId, room };
  emit();
  return room;
}

export function disconnectPersistentTeacherRoom(classId?: string) {
  if (!active || (classId && active.classId !== classId)) return;
  active.room.disconnect();
  active = null;
  emit();
}

export function subscribePersistentLiveMedia(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isPersistentScreenSharing(classId: string) {
  return active?.classId === classId
    && Boolean(active.room.localParticipant.getTrackPublication(Track.Source.ScreenShare));
}

export async function togglePersistentScreenShare(classId: string) {
  if (!active || active.classId !== classId || active.room.state !== ConnectionState.Connected) throw new Error('Live room is not connected');
  const enabled = isPersistentScreenSharing(classId);
  await active.room.localParticipant.setScreenShareEnabled(!enabled, enabled ? undefined : { audio: true, selfBrowserSurface: 'include' });
  emit();
}
