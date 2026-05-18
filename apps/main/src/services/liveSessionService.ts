import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { sanitizeMainStageMode } from './liveClassStage';
import {
  LiveClassPresence,
  LiveClassResponse,
  LiveClassSession,
  LiveWhiteboardBlock,
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
const LIVE_PRESENCE_STALE_MS = 75_000;

function normalizeAssignedIdentifier(value: string | null | undefined) {
  return (value ?? '').trim();
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const mapSession = (data: Record<string, any> | undefined): LiveClassSession => ({
  sessionStatus: (data?.sessionStatus ?? 'idle') as LiveClassSession['sessionStatus'],
  activeWorkbookId: data?.activeWorkbookId ?? null,
  activeLessonId: data?.activeLessonId ?? null,
  activeExerciseId: data?.activeExerciseId ?? null,
  liveAudioTransport: (data?.liveAudioTransport ?? 'not-configured') as LiveClassSession['liveAudioTransport'],
  teacherLiveMicEnabled: Boolean(data?.teacherLiveMicEnabled),
  teacherCameraEnabled: Boolean(data?.teacherCameraEnabled),
  allowStudentLiveMic: Boolean(data?.allowStudentLiveMic),
  studentCameraMode: (data?.studentCameraMode ?? 'off') as LiveClassSession['studentCameraMode'],
  allowStudentWhiteboardEdit: Boolean(data?.allowStudentWhiteboardEdit),
  audioNotesEnabled: data?.audioNotesEnabled !== false,
  mainStageMode: sanitizeMainStageMode(data?.mainStageMode),
  isBoardLocked: Boolean(data?.isBoardLocked),
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

function toPresenceTimestamp(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return null;
}

export function isLivePresenceActive(
  presence: LiveClassPresence,
  now = Date.now(),
  staleMs = LIVE_PRESENCE_STALE_MS,
): boolean {
  if (!presence.isOnline) return false;
  const lastSeenAt = toPresenceTimestamp(presence.lastSeenAt);
  if (lastSeenAt == null) return false;
  return now - lastSeenAt <= staleMs;
}

const mapWhiteboardBlock = (item: unknown, index: number): LiveWhiteboardBlock | null => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const raw = item as Record<string, any>;
  const prompt = typeof raw.prompt === 'string' ? raw.prompt : '';
  const response = typeof raw.response === 'string' ? raw.response : '';
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : `block_${index + 1}`;
  const order = Number.isFinite(raw.order) ? Number(raw.order) : index + 1;
  return {
    id,
    prompt,
    response,
    order,
  };
};

const mapWhiteboard = (data: Record<string, any> | undefined): LiveWhiteboardState => ({
  content: data?.text ?? data?.content ?? '',
  mode: (data?.mode ?? 'free') as LiveWhiteboardState['mode'],
  title: data?.title ?? '',
  instruction: data?.instruction ?? '',
  sourceCourseId: data?.sourceCourseId ?? '',
  sourceWorkbookId: Number.isFinite(data?.sourceWorkbookId) ? Number(data?.sourceWorkbookId) : null,
  sourceLessonId: data?.sourceLessonId ?? '',
  sourceExerciseId: data?.sourceExerciseId ?? '',
  blocks: Array.isArray(data?.blocks)
    ? data.blocks
      .map((item: unknown, index: number) => mapWhiteboardBlock(item, index))
      .filter((item: LiveWhiteboardBlock | null): item is LiveWhiteboardBlock => item !== null)
      .sort((left, right) => {
        if (left.order !== right.order) return left.order - right.order;
        return left.id.localeCompare(right.id);
      })
    : [],
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

const mapExerciseBlock = (id: string, data: Record<string, any>): LiveExerciseBlock => {
  const legacyAssignedTo = normalizeAssignedIdentifier(data.assignedTo);
  const legacyResponses = legacyAssignedTo
    ? { [legacyAssignedTo]: data.answerText ?? '' }
    : {};
  const responses = isStringRecord(data.responses) ? data.responses : legacyResponses;
  const responseStatuses = isStringRecord(data.responseStatuses)
    ? Object.fromEntries(
      Object.entries(data.responseStatuses).map(([key, value]) => [key, value as LiveExerciseBlockStatus]),
    )
    : (legacyAssignedTo ? { [legacyAssignedTo]: (data.status ?? 'pending') as LiveExerciseBlockStatus } : {});
  const responseLocks = isBooleanRecord(data.responseLocks)
    ? data.responseLocks
    : (legacyAssignedTo ? { [legacyAssignedTo]: Boolean(data.isLocked) } : {});

  return {
    id,
    order: Number.isFinite(data.order) ? Number(data.order) : 0,
    prompt: data.prompt ?? '',
    responses,
    responseStatuses,
    responseLocks,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? undefined,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt ?? undefined,
    updatedBy: data.updatedBy
      ? {
        uid: data.updatedBy.uid ?? '',
        name: data.updatedBy.name ?? '',
      }
      : undefined,
  };
};

function getLegacyWhiteboardRef(classId: string) {
  return doc(db, LIVE_CLASSES_COLLECTION, classId, LIVE_SESSION_COLLECTION, LIVE_WHITEBOARD_DOC);
}

function getSharedWhiteboardRef(classId: string) {
  return doc(db, LIVE_CLASSES_COLLECTION, classId, LIVE_SHARED_COLLECTION, LIVE_WHITEBOARD_DOC);
}

function getSessionStateRef(classId: string) {
  return doc(db, LIVE_CLASSES_COLLECTION, classId, LIVE_SESSION_COLLECTION, 'state');
}

function getExerciseSessionRef(classId: string) {
  return doc(db, LIVE_CLASSES_COLLECTION, classId, LIVE_SESSION_COLLECTION, LIVE_EXERCISE_SESSION_DOC);
}

function getExerciseBlocksCollection(classId: string) {
  return collection(db, LIVE_CLASSES_COLLECTION, classId, LIVE_EXERCISE_BLOCKS_COLLECTION);
}

function buildWhiteboardPayload(state: LiveWhiteboardState, updatedByUid: string, updatedByName: string) {
  const normalizedBlocks = (state.blocks ?? [])
    .map((block, index) => ({
      id: block.id?.trim() || `block_${index + 1}`,
      prompt: block.prompt ?? '',
      response: block.response ?? '',
      order: Number.isFinite(block.order) ? Number(block.order) : index + 1,
    }))
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.id.localeCompare(right.id);
    });

  return {
    text: state.content ?? '',
    content: state.content ?? '',
    mode: state.mode ?? 'free',
    title: state.title ?? '',
    instruction: state.instruction ?? '',
    sourceCourseId: state.sourceCourseId ?? '',
    sourceWorkbookId: state.sourceWorkbookId ?? null,
    sourceLessonId: state.sourceLessonId ?? '',
    sourceExerciseId: state.sourceExerciseId ?? '',
    blocks: normalizedBlocks,
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

  const sessionRef = getSessionStateRef(classId);
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

  const sessionRef = getSessionStateRef(classId);
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
  if ('studentCameraMode' in patch) payload.studentCameraMode = patch.studentCameraMode ?? 'off';
  if ('allowStudentWhiteboardEdit' in patch) payload.allowStudentWhiteboardEdit = Boolean(patch.allowStudentWhiteboardEdit);
  if ('audioNotesEnabled' in patch) payload.audioNotesEnabled = patch.audioNotesEnabled !== false;
  if ('mainStageMode' in patch) payload.mainStageMode = sanitizeMainStageMode(patch.mainStageMode);
  if ('isBoardLocked' in patch) payload.isBoardLocked = Boolean(patch.isBoardLocked);

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

  const legacyWhiteboardRef = getLegacyWhiteboardRef(classId);
  const sharedWhiteboardRef = getSharedWhiteboardRef(classId);

  return onSnapshot(
    sharedWhiteboardRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        void getDoc(legacyWhiteboardRef)
          .then((legacySnapshot) => {
            if (!legacySnapshot.exists()) {
              onData(mapWhiteboard(undefined));
              return;
            }

            const legacyData = mapWhiteboard(legacySnapshot.data() as Record<string, any>);
            console.info('[liveSessionService] whiteboard legacy fallback loaded', {
              classId,
              contentLength: legacyData.content?.length ?? 0,
              updatedByUid: legacyData.updatedByUid ?? '',
            });
            onData(legacyData);

            // Migrate a pre-existing board into the single shared source of truth.
            return setDoc(
              sharedWhiteboardRef,
              buildWhiteboardPayload(
                legacyData,
                legacyData.updatedByUid ?? '',
                legacyData.updatedByName ?? '',
              ),
              { merge: true },
            );
          })
          .catch((error) => {
            if (onError) onError(error);
          });
        return;
      }

      const mapped = mapWhiteboard(snapshot.data() as Record<string, any>);
      console.info('[liveSessionService] whiteboard snapshot received', {
        classId,
        contentLength: mapped.content?.length ?? 0,
        updatedByUid: mapped.updatedByUid ?? '',
      });
      onData(mapped);
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export async function updateLiveWhiteboard(
  classId: string,
  state: LiveWhiteboardState,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId) return;

  const sharedWhiteboardRef = getSharedWhiteboardRef(classId);
  const payload = buildWhiteboardPayload(state, updatedByUid, updatedByName);
  console.info('[liveSessionService] whiteboard update requested', {
    classId,
    updatedByUid,
    contentLength: state.content?.length ?? 0,
    mode: state.mode ?? 'free',
    blockCount: state.blocks?.length ?? 0,
  });

  await setDoc(sharedWhiteboardRef, payload, { merge: true });
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
  input: Partial<Pick<LiveExerciseBlock, 'order' | 'prompt'>>,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId) return;

  await addDoc(getExerciseBlocksCollection(classId), {
    order: input.order ?? 1,
    prompt: input.prompt?.trim() ?? '',
    responses: {},
    responseStatuses: {},
    responseLocks: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: buildExerciseActor(updatedByUid, updatedByName),
  });
}

export async function updateExerciseBlock(
  classId: string,
  blockId: string,
  patch: Partial<Pick<LiveExerciseBlock, 'order' | 'prompt'>>,
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
  if ('prompt' in patch) payload.prompt = patch.prompt?.trim() ?? '';

  await setDoc(
    doc(getExerciseBlocksCollection(classId), blockId),
    payload,
    { merge: true },
  );
}

export async function updateExerciseBlockResponse(
  classId: string,
  blockId: string,
  studentUid: string,
  answerText: string,
  status: LiveExerciseBlockStatus,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !blockId || !studentUid) return;
  console.info('[liveSessionService] exercise response update requested', {
    classId,
    blockId,
    studentUid,
    answerLength: answerText.length,
    status,
    updatedByUid,
  });

  await setDoc(
    doc(getExerciseBlocksCollection(classId), blockId),
    {
      [`responses.${studentUid}`]: answerText,
      [`responseStatuses.${studentUid}`]: status,
      updatedAt: serverTimestamp(),
      updatedBy: buildExerciseActor(updatedByUid, updatedByName),
    },
    { merge: true },
  );
}

export async function setExerciseBlockStudentLock(
  classId: string,
  blockId: string,
  studentUid: string,
  isLocked: boolean,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !blockId || !studentUid) return;

  await setDoc(
    doc(getExerciseBlocksCollection(classId), blockId),
    {
      [`responseLocks.${studentUid}`]: isLocked,
      updatedAt: serverTimestamp(),
      updatedBy: buildExerciseActor(updatedByUid, updatedByName),
    },
    { merge: true },
  );
}

export async function setExerciseBlockStudentStatus(
  classId: string,
  blockId: string,
  studentUid: string,
  status: LiveExerciseBlockStatus,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !blockId || !studentUid) return;

  await setDoc(
    doc(getExerciseBlocksCollection(classId), blockId),
    {
      [`responseStatuses.${studentUid}`]: status,
      updatedAt: serverTimestamp(),
      updatedBy: buildExerciseActor(updatedByUid, updatedByName),
    },
    { merge: true },
  );
}

export async function clearExerciseBlockStudentResponse(
  classId: string,
  blockId: string,
  studentUid: string,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !blockId || !studentUid) return;

  await setDoc(
    doc(getExerciseBlocksCollection(classId), blockId),
    {
      [`responses.${studentUid}`]: '',
      [`responseStatuses.${studentUid}`]: 'pending',
      updatedAt: serverTimestamp(),
      updatedBy: buildExerciseActor(updatedByUid, updatedByName),
    },
    { merge: true },
  );
}

export async function clearExerciseBlockStudentLock(
  classId: string,
  blockId: string,
  studentUid: string,
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !blockId || !studentUid) return;

  await setDoc(
    doc(getExerciseBlocksCollection(classId), blockId),
    {
      [`responseLocks.${studentUid}`]: deleteField(),
      updatedAt: serverTimestamp(),
      updatedBy: buildExerciseActor(updatedByUid, updatedByName),
    },
    { merge: true },
  );
}
