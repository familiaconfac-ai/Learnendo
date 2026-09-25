import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { LIVE_MEDIA_PARTICIPANT_STALE_MS } from './liveMediaPolicy';

export interface LiveMediaParticipantState {
  uid: string;
  role: 'teacher' | 'student';
  tabId: string;
  connecting: boolean;
  microphoneActive: boolean;
  cameraActive: boolean;
  screenShareActive: boolean;
  updatedAtMs?: number;
}

const mediaCollection = (classId: string) => collection(db, 'liveClasses', classId, 'mediaParticipants');

export async function updateLiveMediaParticipant(
  classId: string,
  state: Omit<LiveMediaParticipantState, 'updatedAtMs'>,
): Promise<void> {
  if (!classId || !state.uid) return;
  await setDoc(doc(mediaCollection(classId), state.uid), {
    ...state,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function subscribeLiveMediaParticipants(
  classId: string,
  onData: (participants: LiveMediaParticipantState[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  let cached: LiveMediaParticipantState[] = [];
  const emitFresh = () => {
    const now = Date.now();
    onData(cached.filter((participant) => (
      !participant.updatedAtMs || now - participant.updatedAtMs <= LIVE_MEDIA_PARTICIPANT_STALE_MS
    )));
  };
  const unsubscribe = onSnapshot(mediaCollection(classId), (snapshot) => {
    cached = snapshot.docs.map((entry) => {
      const data = entry.data();
      return {
        uid: entry.id,
        role: data.role === 'teacher' ? 'teacher' : 'student',
        tabId: typeof data.tabId === 'string' ? data.tabId : '',
        connecting: data.connecting === true,
        microphoneActive: data.microphoneActive === true,
        cameraActive: data.cameraActive === true,
        screenShareActive: data.screenShareActive === true,
        updatedAtMs: data.updatedAt?.toMillis?.() ?? 0,
      } satisfies LiveMediaParticipantState;
    });
    emitFresh();
  }, onError);
  const interval = window.setInterval(emitFresh, 5_000);
  return () => {
    window.clearInterval(interval);
    unsubscribe();
  };
}

export function participantHasActiveMedia(participant: LiveMediaParticipantState): boolean {
  return participant.microphoneActive || participant.cameraActive || participant.screenShareActive;
}
