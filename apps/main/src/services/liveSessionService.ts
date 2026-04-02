import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  LiveClassPresence,
  LiveClassResponse,
  LiveClassSession,
  LiveExerciseBlock,
  LiveExerciseBlockStatus,
  LiveExerciseSession,
  LiveWhiteboardState,
} from '../types';

const LIVE_CLASSES_COLLECTION = 'liveClasses';
const LIVE_SESSION_COLLECTION = 'session';
const LIVE_SHARED_COLLECTION = 'shared';
const LIVE_WHITEBOARD_DOC = 'whiteboard';
const LIVE_EXERCISE_SESSION_DOC = 'exerciseSession';
const LIVE_EXERCISE_BLOCKS_COLLECTION = 'exerciseBlocks';

const mapSession = (data: Record<string, any> | undefined): LiveClassSession => ({
  sessionStatus: (data?.sessionStatus ?? 'idle') as LiveClassSession['sessionStatus'],
  activeWorkbookId: data?.activeWorkbookId ?? null,
  activeLessonId: data?.activeLessonId ?? null,
  activeExerciseId: data?.activeExerciseId ?? null,
  liveAudioTransport: (data?.liveAudioTransport ?? 'not-configured') as LiveClassSession['liveAudioTransport'],
  teacherLiveMicEnabled: Boolean(data?.teacherLiveMicEnabled),
  teacherCameraEnabled: Boolean(data?.teacherCameraEnabled),
  allowStudentLiveMic: Boolean(data?.allowStudentLiveMic),
  audioNotesEnabled: data?.audioNotesEnabled !== false,
  lastUpdatedBy: data?.lastUpdatedBy ?? '',
  updatedAt: data?.updatedAt?.toDate?.()?.toISOString?.() ?? data?.updatedAt ?? undefined,
});

const mapResponse = (id: string, data: Record<string, any>): LiveClassResponse => ({
  id,
  userId: data.userId ?? '',
  userName: data.userName ?? 'Student',
  workbookId: data.workbookId ?? null,
  lessonId: data.lessonId ?? null,
  exerciseId: data.exerciseId ?? null,
  answer: data.answer ?? '',
  createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? undefined,
});

const mapPresence = (id: string, data: Record<string, any>): LiveClassPresence => ({
  uid: id,
  name: data.name ?? 'Student',
  role: (data.role ?? 'student') as LiveClassPresence['role'],
  isOnline: Boolean(data.isOnline),
  lastSeenAt: data.lastSeenAt?.toDate?.()?.toISOString?.() ?? data.lastSeenAt ?? undefined,
});

const mapWhiteboard = (data: Record<string, any> | undefined): LiveWhiteboardState => ({
  content: data?.text ?? data?.content ?? '',
  updatedByUid: data?.updatedBy?.uid ?? data?.updatedByUid ?? '',
  updatedByName: data?.updatedBy?.name ?? data?.updatedByName ?? '',
  updatedAt: data?.updatedAt?.toDate?.()?.toISOString?.() ?? data?.updatedAt ?? undefined,
});

const mapExerciseSession = (data: Record<string, any> | undefined): LiveExerciseSession => ({
  title: data?.title ?? '',
  isActive: data ? data.isActive !== false : false,
  endedAt: data?.endedAt?.toDate?.()?.toISOString?.() ?? data?.endedAt ?? undefined,
  updatedAt: data?.updatedAt?.toDate?.()?.toISOString?.() ?? data?.updatedAt ?? undefined,
  updatedBy: data?.updatedBy
    ? {
      uid: data.updatedBy.uid ?? '',
      name: data.updatedBy.name ?? '',
    }
    : undefined,
});

const mapExerciseBlock = (id: string, data: Record<string, any>): LiveExerciseBlock => ({
  id,
  order: Number.isFinite(data.order) ? Number(data.order) : 0,
  prompt: data.prompt ?? '',
  answerText: data.answerText ?? '',
  assignedTo: data.assignedTo ?? '',
  assignedToName: data.assignedToName ?? '',
  status: (data.status ?? 'pending') as LiveExerciseBlockStatus,
  isLocked: Boolean(data.isLocked),
  createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? undefined,
  updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt ?? undefined,
  updatedBy: data.updatedBy
    ? {
      uid: data.updatedBy.uid ?? '',
      name: data.updatedBy.name ?? '',
    }
    : undefined,
});

function getLegacyWhiteboardRef(classId: string) {
  return doc(db, LIVE_CLASSES_COLLECTION, classId, LIVE_SESSION_COLLECTION, LIVE_WHITEBOARD_DOC);
}

function getSharedWhiteboardRef(classId: string) {
  return doc(db, LIVE_CLASSES_COLLECTION, classId, LIVE_SHARED_COLLECTION, LIVE_WHITEBOARD_DOC);
}

function getExerciseSessionRef(classId: string) {
  return doc(db, LIVE_CLASSES_COLLECTION, classId, LIVE_SESSION_COLLECTION, LIVE_EXERCISE_SESSION_DOC);
}

function getExerciseBlocksCollection(classId: string) {
  return collection(db, LIVE_CLASSES_COLLECTION, classId, LIVE_EXERCISE_BLOCKS_COLLECTION);
}

function buildWhiteboardPayload(content: string, updatedByUid: string, updatedByName: string) {
  return {
    text: content,
    content,
    updatedBy: {
      uid: updatedByUid,
      name: updatedByName,
    },
    updatedByUid,
    updatedByName,
    updatedAt: serverTimestamp(),
  };
}

function buildExerciseActor(updatedByUid: string, updatedByName: string) {
  return {
    uid: updatedByUid,
    name: updatedByName,
  };
}

export function subscribeLiveSession(
  classId: string,
  onData: (session: LiveClassSession) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !classId) {
    onData(mapSession(undefined));
    return () => {};
  }

  const sessionRef = doc(db, LIVE_CLASSES_COLLECTION, classId, LIVE_SESSION_COLLECTION, 'state');
  return onSnapshot(
    sessionRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(mapSession(undefined));
        return;
      }
      onData(mapSession(snapshot.data() as Record<string, any>));
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export async function updateLiveSession(
  classId: string,
  patch: Partial<LiveClassSession>,
  updatedBy: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId) return;

  const sessionRef = doc(db, LIVE_CLASSES_COLLECTION, classId, LIVE_SESSION_COLLECTION, 'state');
  const payload: Record<string, unknown> = {
    lastUpdatedBy: updatedBy,
    updatedAt: serverTimestamp(),
  };

  if ('sessionStatus' in patch) payload.sessionStatus = patch.sessionStatus ?? 'idle';
  if ('activeWorkbookId' in patch) payload.activeWorkbookId = patch.activeWorkbookId ?? null;
  if ('activeLessonId' in patch) payload.activeLessonId = patch.activeLessonId ?? null;
  if ('activeExerciseId' in patch) payload.activeExerciseId = patch.activeExerciseId ?? null;
  if ('liveAudioTransport' in patch) payload.liveAudioTransport = patch.liveAudioTransport ?? 'not-configured';
  if ('teacherLiveMicEnabled' in patch) payload.teacherLiveMicEnabled = Boolean(patch.teacherLiveMicEnabled);
  if ('teacherCameraEnabled' in patch) payload.teacherCameraEnabled = Boolean(patch.teacherCameraEnabled);
  if ('allowStudentLiveMic' in patch) payload.allowStudentLiveMic = Boolean(patch.allowStudentLiveMic);
  if ('audioNotesEnabled' in patch) payload.audioNotesEnabled = patch.audioNotesEnabled !== false;

  await setDoc(
    sessionRef,
    payload,
    { merge: true },
  );
}

export async function submitLiveResponse(
  classId: string,
  response: Omit<LiveClassResponse, 'id' | 'createdAt'>,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId) return;

  const responsesRef = collection(db, LIVE_CLASSES_COLLECTION, classId, 'responses');
  await addDoc(responsesRef, {
    ...response,
    createdAt: serverTimestamp(),
  });
}

export function subscribeLiveResponses(
  classId: string,
  onData: (responses: LiveClassResponse[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !classId) {
    onData([]);
    return () => {};
  }

  const responsesRef = collection(db, LIVE_CLASSES_COLLECTION, classId, 'responses');
  return onSnapshot(
    responsesRef,
    (snapshot) => {
      const responses = snapshot.docs.map((d) => mapResponse(d.id, d.data() as Record<string, any>));
      onData(responses);
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export function subscribeLivePresence(
  classId: string,
  onData: (presence: LiveClassPresence[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !classId) {
    onData([]);
    return () => {};
  }

  const presenceRef = collection(db, LIVE_CLASSES_COLLECTION, classId, 'presence');
  const presenceQuery = query(presenceRef);
  return onSnapshot(
    presenceQuery,
    (snapshot) => {
      const presence = snapshot.docs.map((d) => mapPresence(d.id, d.data() as Record<string, any>));
      onData(presence);
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export async function upsertLivePresence(
  classId: string,
  uid: string,
  name: string,
  role: LiveClassPresence['role'],
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !uid) return;

  const presenceRef = doc(db, LIVE_CLASSES_COLLECTION, classId, 'presence', uid);
  await setDoc(
    presenceRef,
    {
      name: name.trim() || 'Student',
      role,
      isOnline: true,
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function markLivePresenceOffline(classId: string, uid: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !uid) return;

  const presenceRef = doc(db, LIVE_CLASSES_COLLECTION, classId, 'presence', uid);
  await setDoc(
    presenceRef,
    {
      isOnline: false,
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeLiveWhiteboard(
  classId: string,
  onData: (whiteboard: LiveWhiteboardState) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !classId) {
    onData(mapWhiteboard(undefined));
    return () => {};
  }

  const whiteboardRef = getLegacyWhiteboardRef(classId);
  const sharedWhiteboardRef = getSharedWhiteboardRef(classId);
  let migratedSharedSnapshot = false;

  return onSnapshot(
    whiteboardRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        if (migratedSharedSnapshot) {
          onData(mapWhiteboard(undefined));
          return;
        }

        migratedSharedSnapshot = true;
        void getDoc(sharedWhiteboardRef)
          .then((sharedSnapshot) => {
            if (!sharedSnapshot.exists()) {
              onData(mapWhiteboard(undefined));
              return;
            }

            const sharedData = mapWhiteboard(sharedSnapshot.data() as Record<string, any>);
            onData(sharedData);

            // Mirror any existing shared whiteboard data back into the live session path.
            return setDoc(
              whiteboardRef,
              buildWhiteboardPayload(
                sharedData.content ?? '',
                sharedData.updatedByUid ?? '',
                sharedData.updatedByName ?? '',
              ),
              { merge: true },
            );
          })
          .catch((error) => {
            if (onError) onError(error);
          });
        return;
      }
      onData(mapWhiteboard(snapshot.data() as Record<string, any>));
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export async function updateLiveWhiteboard(
  classId: string,
  content: string,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId) return;

  const whiteboardRef = getLegacyWhiteboardRef(classId);
  const sharedWhiteboardRef = getSharedWhiteboardRef(classId);
  const payload = buildWhiteboardPayload(content, updatedByUid, updatedByName);

  await Promise.all([
    setDoc(whiteboardRef, payload, { merge: true }),
    setDoc(sharedWhiteboardRef, payload, { merge: true }),
  ]);
}

export function subscribeExerciseSession(
  classId: string,
  onData: (session: LiveExerciseSession) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !classId) {
    onData(mapExerciseSession(undefined));
    return () => {};
  }

  return onSnapshot(
    getExerciseSessionRef(classId),
    (snapshot) => {
      onData(snapshot.exists() ? mapExerciseSession(snapshot.data() as Record<string, any>) : mapExerciseSession(undefined));
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export function subscribeExerciseBlocks(
  classId: string,
  onData: (blocks: LiveExerciseBlock[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !classId) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    getExerciseBlocksCollection(classId),
    (snapshot) => {
      const blocks = snapshot.docs
        .map((item) => mapExerciseBlock(item.id, item.data() as Record<string, any>))
        .sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return a.id.localeCompare(b.id);
        });
      onData(blocks);
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export async function saveExerciseSession(
  classId: string,
  patch: Partial<Pick<LiveExerciseSession, 'title' | 'isActive'>>,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId) return;

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    updatedBy: buildExerciseActor(updatedByUid, updatedByName),
  };

  if ('title' in patch) payload.title = patch.title ?? '';
  if ('isActive' in patch) {
    payload.isActive = patch.isActive !== false;
    if (patch.isActive !== false) payload.endedAt = null;
  }

  await setDoc(getExerciseSessionRef(classId), payload, { merge: true });
}

export async function endExerciseSession(
  classId: string,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId) return;

  await setDoc(
    getExerciseSessionRef(classId),
    {
      isActive: false,
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: buildExerciseActor(updatedByUid, updatedByName),
    },
    { merge: true },
  );
}

export async function createExerciseBlock(
  classId: string,
  input: Partial<Pick<LiveExerciseBlock, 'order' | 'prompt' | 'assignedTo' | 'assignedToName' | 'status' | 'isLocked'>>,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId) return;

  await addDoc(getExerciseBlocksCollection(classId), {
    order: input.order ?? 1,
    prompt: input.prompt ?? '',
    answerText: '',
    assignedTo: input.assignedTo ?? '',
    assignedToName: input.assignedToName ?? '',
    status: input.status ?? 'pending',
    isLocked: input.isLocked ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: buildExerciseActor(updatedByUid, updatedByName),
  });
}

export async function updateExerciseBlock(
  classId: string,
  blockId: string,
  patch: Partial<Pick<LiveExerciseBlock, 'order' | 'prompt' | 'answerText' | 'assignedTo' | 'assignedToName' | 'status' | 'isLocked'>>,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !blockId) return;

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    updatedBy: buildExerciseActor(updatedByUid, updatedByName),
  };

  if ('order' in patch) payload.order = patch.order ?? 0;
  if ('prompt' in patch) payload.prompt = patch.prompt ?? '';
  if ('answerText' in patch) payload.answerText = patch.answerText ?? '';
  if ('assignedTo' in patch) payload.assignedTo = patch.assignedTo ?? '';
  if ('assignedToName' in patch) payload.assignedToName = patch.assignedToName ?? '';
  if ('status' in patch) payload.status = patch.status ?? 'pending';
  if ('isLocked' in patch) payload.isLocked = Boolean(patch.isLocked);

  await setDoc(
    doc(getExerciseBlocksCollection(classId), blockId),
    payload,
    { merge: true },
  );
}
