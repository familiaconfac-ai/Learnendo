import {
  addDoc,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { LiveClass, LiveClassGroup, LiveClassGroupInput, LiveClassInput, LiveClassMessage, LiveClassRole } from '../types';
import type { UserRole } from './userRoles';

const LIVE_CLASSES_COLLECTION = 'liveClasses';
const LIVE_CLASS_GROUPS_COLLECTION = 'liveClassGroups';
export const LIVE_CLASS_MESSAGE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;
export const AUDIO_NOTE_EXPIRATION_MS = LIVE_CLASS_MESSAGE_EXPIRATION_MS;

function deriveLiveClassStatus(date: string, time: string): LiveClass['status'] {
  if (!date || !time) return 'upcoming';

  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) return 'upcoming';

  const end = new Date(start.getTime() + (60 * 60 * 1000));
  const now = new Date();

  if (now < start) return 'upcoming';
  if (now <= end) return 'live';
  return 'finished';
}

function sortLiveClasses(classes: LiveClass[]): LiveClass[] {
  return [...classes].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function normalizeExternalLink(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeStudentIds(ids: string[] | undefined): string[] {
  if (!ids || ids.length === 0) return [];
  const cleaned = ids
    .map((id) => id.trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

function normalizeStudentNames(names: string[] | undefined): string[] {
  if (!names || names.length === 0) return [];
  return names
    .map((name) => name.trim())
    .filter(Boolean);
}

function buildLiveClassPayload(input: LiveClassInput) {
  const normalizedMeetingLink = normalizeExternalLink(input.meetingLink);
  const normalizedMeetUrl = normalizeExternalLink(input.meetUrl ?? input.meetingLink);
  return {
    title: input.title.trim(),
    teacherName: input.teacherName.trim(),
    courseId: input.courseId?.trim() ?? '',
    groupId: input.groupId?.trim() ?? '',
    groupName: input.groupName?.trim() ?? '',
    date: input.date,
    time: input.time,
    meetingLink: normalizedMeetingLink,
    meetUrl: normalizedMeetUrl,
    presentationUrl: normalizeExternalLink(input.presentationUrl ?? ''),
    whatsappLink: normalizeExternalLink(input.whatsappLink ?? ''),
    description: input.description?.trim() ?? '',
    workbookId: input.workbookId ?? null,
    unitId: input.unitId?.trim() ?? null,
    lessonId: input.lessonId?.trim() ?? null,
    isPrivate: input.isPrivate ?? true,
    assignedStudentIds: normalizeStudentIds(input.assignedStudentIds),
    assignedStudentNames: normalizeStudentNames(input.assignedStudentNames),
    status: deriveLiveClassStatus(input.date, input.time),
  };
}

const mapLiveClass = (id: string, data: Record<string, any>): LiveClass => ({
  id,
  title: data.title ?? 'Untitled class',
  teacherName: data.teacherName ?? 'Teacher',
  teacherUid: data.teacherUid ?? data.createdBy ?? '',
  courseId: data.courseId ?? '',
  groupId: data.groupId ?? '',
  groupName: data.groupName ?? '',
  date: data.date ?? '',
  time: data.time ?? '',
  meetingLink: data.meetingLink ?? data.meetUrl ?? '',
  meetUrl: data.meetUrl ?? data.meetingLink ?? '',
  presentationUrl: data.presentationUrl ?? data.materialLink ?? '',
  whatsappLink: data.whatsappLink ?? '',
  description: data.description ?? '',
  workbookId: data.workbookId ?? null,
  unitId: data.unitId ?? null,
  lessonId: data.lessonId ?? null,
  isPrivate: data.isPrivate ?? false,
  assignedStudentIds: Array.isArray(data.assignedStudentIds) ? data.assignedStudentIds : [],
  assignedStudentNames: Array.isArray(data.assignedStudentNames) ? data.assignedStudentNames : [],
  status: deriveLiveClassStatus(data.date ?? '', data.time ?? ''),
  createdBy: data.createdBy ?? '',
  createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? undefined,
  updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt ?? undefined,
});

const mapMessage = (id: string, data: Record<string, any>): LiveClassMessage => ({
  id,
  type: (data.type ?? 'text') as LiveClassMessage['type'],
  role: (data.role ?? 'student') as LiveClassMessage['role'],
  text: data.text ?? '',
  audioDataUrl: data.audioDataUrl ?? '',
  audioMimeType: data.audioMimeType ?? '',
  audioDurationSec: Number(data.audioDurationSec ?? 0) || undefined,
  isPinned: data.isPinned === true,
  pinnedAt: data.pinnedAt?.toDate?.()?.toISOString?.() ?? data.pinnedAt ?? undefined,
  pinnedByUid: data.pinnedByUid ?? undefined,
  pinnedByName: data.pinnedByName ?? undefined,
  expiresAtMs: typeof data.expiresAtMs === 'number' ? data.expiresAtMs : undefined,
  senderUid: data.senderUid ?? '',
  senderName: data.senderName ?? 'Student',
  createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? undefined,
});

export function getLiveClassMeetLink(liveClass: Pick<LiveClass, 'meetUrl' | 'meetingLink'>): string {
  return (liveClass.meetUrl ?? liveClass.meetingLink ?? '').trim();
}

export interface LiveClassViewer {
  uid: string;
  email?: string | null;
  name?: string | null;
  role: UserRole;
}

export function isStudentAssignedToLiveClass(
  liveClass: Pick<LiveClass, 'assignedStudentIds' | 'assignedStudentNames'>,
  userUid: string,
  userEmail?: string | null,
  userName?: string | null,
): boolean {
  if (!userUid && !userEmail && !userName) return false;
  const allowedIds = normalizeStudentIds(liveClass.assignedStudentIds ?? []);
  const allowedNames = normalizeStudentNames(liveClass.assignedStudentNames ?? []).map((item) => item.toLowerCase());
  const normalizedEmail = (userEmail ?? '').trim().toLowerCase();
  const normalizedName = (userName ?? '').trim().toLowerCase();
  const emailLocalPart = normalizedEmail.includes('@') ? normalizedEmail.split('@')[0] : normalizedEmail;
  return allowedIds.some((entry) => {
    const normalizedEntry = entry.trim().toLowerCase();
    return normalizedEntry === userUid || (normalizedEmail ? normalizedEntry === normalizedEmail : false);
  }) || (
    normalizedName
      ? allowedNames.includes(normalizedName) || allowedNames.includes(emailLocalPart)
      : false
  );
}

export function canManageLiveClass(
  liveClass: Pick<LiveClass, 'createdBy' | 'teacherUid'>,
  viewer: Pick<LiveClassViewer, 'uid' | 'role'>,
): boolean {
  if (!viewer.uid) return false;
  if (viewer.role === 'admin') return true;
  if (viewer.role !== 'teacher') return false;
  return liveClass.createdBy === viewer.uid || liveClass.teacherUid === viewer.uid;
}

export function canViewLiveClass(
  liveClass: Pick<LiveClass, 'createdBy' | 'teacherUid' | 'assignedStudentIds' | 'assignedStudentNames'>,
  viewer: LiveClassViewer,
): boolean {
  if (!viewer.uid) return false;
  if (canManageLiveClass(liveClass, viewer)) return true;
  return isStudentAssignedToLiveClass(liveClass, viewer.uid, viewer.email, viewer.name);
}

export function filterLiveClassesForViewer(
  classes: LiveClass[],
  viewer: LiveClassViewer,
): LiveClass[] {
  return classes.filter((item) => canViewLiveClass(item, viewer));
}

export function canAccessLiveClass(
  liveClass: Pick<LiveClass, 'createdBy' | 'teacherUid' | 'assignedStudentIds' | 'assignedStudentNames'>,
  viewer: LiveClassViewer,
): boolean {
  return canViewLiveClass(liveClass, viewer);
}

function mergeLiveClassSnapshots(chunks: LiveClass[][]): LiveClass[] {
  const byId = new Map<string, LiveClass>();
  chunks.flat().forEach((liveClass) => {
    byId.set(liveClass.id, liveClass);
  });
  return sortLiveClasses(Array.from(byId.values()));
}

function buildViewerStudentKeys(viewer: LiveClassViewer): string[] {
  const normalizedEmail = (viewer.email ?? '').trim();
  const normalizedEmailLower = normalizedEmail.toLowerCase();
  return Array.from(
    new Set(
      [viewer.uid, normalizedEmail, normalizedEmailLower]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function subscribeLiveClasses(
  viewer: LiveClassViewer,
  onData: (classes: LiveClass[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !viewer.uid) {
    onData([]);
    return () => {};
  }

  const classesRef = collection(db, LIVE_CLASSES_COLLECTION);
  const queries = viewer.role === 'admin'
    ? [classesRef]
    : viewer.role === 'teacher'
      ? [
        query(classesRef, where('teacherUid', '==', viewer.uid)),
        query(classesRef, where('createdBy', '==', viewer.uid)),
      ]
      : [classesRef];

  const snapshots = new Map<number, LiveClass[]>();
  const unsubscribes = queries.map((source, index) => onSnapshot(
    source,
    (snapshot) => {
      const mapped = snapshot.docs.map((d) => mapLiveClass(d.id, d.data() as Record<string, any>));
      snapshots.set(index, mapped);
      const classes = mergeLiveClassSnapshots(Array.from(snapshots.values()));
      const visibleClasses = viewer.role === 'student'
        ? filterLiveClassesForViewer(classes, viewer)
        : classes;
      console.log('[LiveClassesService] subscribeLiveClasses snapshot', {
        collection: LIVE_CLASSES_COLLECTION,
        viewerRole: viewer.role,
        fetchedCount: classes.length,
        visibleCount: visibleClasses.length,
      });
      onData(visibleClasses);
    },
    (error) => {
      console.warn('[LiveClassesService] subscribeLiveClasses failed', error);
      if (onError) onError(error);
    },
  ));

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

export function subscribeLiveClass(
  classId: string,
  onData: (liveClass: LiveClass | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !classId) {
    onData(null);
    return () => {};
  }

  const classRef = doc(db, LIVE_CLASSES_COLLECTION, classId);
  return onSnapshot(
    classRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(mapLiveClass(snapshot.id, snapshot.data() as Record<string, any>));
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export async function getLiveClass(classId: string): Promise<LiveClass | null> {
  if (!db || !classId) return null;
  const classRef = doc(db, LIVE_CLASSES_COLLECTION, classId);
  const snapshot = await getDoc(classRef);
  if (!snapshot.exists()) return null;
  return mapLiveClass(snapshot.id, snapshot.data() as Record<string, any>);
}

export async function createLiveClass(createdBy: string, input: LiveClassInput): Promise<string> {
  if (!db) throw new Error('Firestore is not initialized');

  const payload = {
    ...buildLiveClassPayload(input),
    createdBy,
    teacherUid: createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.log('[LiveClassesService] createLiveClass payload', {
    collection: LIVE_CLASSES_COLLECTION,
    payload,
  });

  const docRef = await addDoc(collection(db, LIVE_CLASSES_COLLECTION), payload);
  console.log('[LiveClassesService] createLiveClass success', {
    collection: LIVE_CLASSES_COLLECTION,
    documentId: docRef.id,
  });
  return docRef.id;
}

export async function updateLiveClass(classId: string, input: Partial<LiveClassInput>): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  const classRef = doc(db, LIVE_CLASSES_COLLECTION, classId);
  const payload = {
    ...buildLiveClassPayload({
      title: input.title ?? '',
      teacherName: input.teacherName ?? '',
      courseId: input.courseId ?? '',
      groupId: input.groupId ?? '',
      groupName: input.groupName ?? '',
      date: input.date ?? '',
      time: input.time ?? '',
      meetingLink: input.meetingLink ?? '',
      meetUrl: input.meetUrl ?? input.meetingLink ?? '',
      presentationUrl: input.presentationUrl ?? '',
      whatsappLink: input.whatsappLink ?? '',
      description: input.description ?? '',
      workbookId: input.workbookId ?? null,
      unitId: input.unitId ?? null,
      lessonId: input.lessonId ?? null,
      isPrivate: input.isPrivate ?? true,
      assignedStudentIds: input.assignedStudentIds ?? [],
      assignedStudentNames: input.assignedStudentNames ?? [],
    }),
    updatedAt: serverTimestamp(),
  };
  console.log('[LiveClassesService] updateLiveClass payload', {
    collection: LIVE_CLASSES_COLLECTION,
    classId,
    payload,
  });
  await updateDoc(classRef, payload);
}

export async function deleteLiveClass(classId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId) return;
  const classRef = doc(db, LIVE_CLASSES_COLLECTION, classId);
  await deleteDoc(classRef);
}

export function getLiveClassPresentationLink(liveClass: Pick<LiveClass, 'presentationUrl'>): string {
  return (liveClass.presentationUrl ?? '').trim();
}

function buildLiveClassGroupPayload(input: LiveClassGroupInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    whatsappLink: normalizeExternalLink(input.whatsappLink ?? ''),
    assignedStudentIds: normalizeStudentIds(input.assignedStudentIds),
    assignedStudentNames: normalizeStudentNames(input.assignedStudentNames),
  };
}

const mapLiveClassGroup = (id: string, data: Record<string, any>): LiveClassGroup => ({
  id,
  name: data.name ?? 'Untitled group',
  description: data.description ?? '',
  whatsappLink: data.whatsappLink ?? '',
  assignedStudentIds: Array.isArray(data.assignedStudentIds) ? data.assignedStudentIds : [],
  assignedStudentNames: Array.isArray(data.assignedStudentNames) ? data.assignedStudentNames : [],
  createdBy: data.createdBy ?? '',
  createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? undefined,
  updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt ?? undefined,
});

export function subscribeLiveClassGroups(
  viewer: Pick<LiveClassViewer, 'uid' | 'role'>,
  onData: (groups: LiveClassGroup[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !viewer.uid) {
    onData([]);
    return () => {};
  }

  const groupsRef = collection(db, LIVE_CLASS_GROUPS_COLLECTION);
  const groupsQuery = viewer.role === 'admin'
    ? groupsRef
    : query(groupsRef, where('createdBy', '==', viewer.uid));

  return onSnapshot(
    groupsQuery,
    (snapshot) => {
      const groups = snapshot.docs
        .map((d) => mapLiveClassGroup(d.id, d.data() as Record<string, any>))
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(groups);
    },
    (error) => {
      console.warn('[LiveClassesService] subscribeLiveClassGroups failed', error);
      if (onError) onError(error);
    },
  );
}

export async function createLiveClassGroup(createdBy: string, input: LiveClassGroupInput): Promise<string> {
  if (!db) throw new Error('Firestore is not initialized');

  const payload = {
    ...buildLiveClassGroupPayload(input),
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, LIVE_CLASS_GROUPS_COLLECTION), payload);
  return docRef.id;
}

export async function updateLiveClassGroup(groupId: string, input: LiveClassGroupInput): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!groupId) return;

  const groupRef = doc(db, LIVE_CLASS_GROUPS_COLLECTION, groupId);
  await updateDoc(groupRef, {
    ...buildLiveClassGroupPayload(input),
    updatedAt: serverTimestamp(),
  });
}

export async function ensureLiveClassSession(classId: string): Promise<void> {
  if (!db || !classId) return;
  const sessionRef = doc(db, LIVE_CLASSES_COLLECTION, classId, 'session', 'state');
  await setDoc(
    sessionRef,
    {
      sessionStatus: 'idle',
      activeWorkbookId: null,
      activeLessonId: null,
      activeExerciseId: null,
      liveAudioTransport: 'not-configured',
      teacherLiveMicEnabled: false,
      teacherCameraEnabled: false,
      allowStudentLiveMic: false,
      studentCameraMode: 'off',
      allowStudentWhiteboardEdit: false,
      audioNotesEnabled: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeLiveClassMessages(
  classId: string,
  onData: (messages: LiveClassMessage[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !classId) {
    onData([]);
    return () => {};
  }

  const messagesRef = collection(db, LIVE_CLASSES_COLLECTION, classId, 'messages');
  const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => mapMessage(d.id, d.data() as Record<string, any>));
      onData(messages);
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export async function sendLiveClassMessage(
  classId: string,
  senderUid: string,
  senderName: string,
  text: string,
  role: LiveClassRole = 'student',
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !text.trim()) return;

  const messagesRef = collection(db, LIVE_CLASSES_COLLECTION, classId, 'messages');
  await addDoc(messagesRef, {
    type: 'text',
    role,
    text: text.trim(),
    isPinned: false,
    expiresAtMs: Date.now() + LIVE_CLASS_MESSAGE_EXPIRATION_MS,
    senderUid,
    senderName,
    createdAt: serverTimestamp(),
  });
}

export async function sendLiveClassAudioMessage(
  classId: string,
  senderUid: string,
  senderName: string,
  audioDataUrl: string,
  audioMimeType: string,
  audioDurationSec?: number,
  role: LiveClassRole = 'student',
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !audioDataUrl) return;

  const messagesRef = collection(db, LIVE_CLASSES_COLLECTION, classId, 'messages');
  await addDoc(messagesRef, {
    type: 'audio',
    role,
    text: '',
    audioDataUrl,
    audioMimeType,
    audioDurationSec: audioDurationSec ?? 0,
    isPinned: false,
    expiresAtMs: Date.now() + LIVE_CLASS_MESSAGE_EXPIRATION_MS,
    senderUid,
    senderName,
    createdAt: serverTimestamp(),
  });
}

export async function deleteLiveClassMessage(classId: string, messageId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !messageId) return;

  const messageRef = doc(db, LIVE_CLASSES_COLLECTION, classId, 'messages', messageId);
  await deleteDoc(messageRef);
}

export async function setLiveClassMessagePinned(
  classId: string,
  messageId: string,
  pinned: boolean,
  actorUid: string,
  actorName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !messageId) return;

  const messageRef = doc(db, LIVE_CLASSES_COLLECTION, classId, 'messages', messageId);
  if (pinned) {
    await updateDoc(messageRef, {
      isPinned: true,
      pinnedAt: serverTimestamp(),
      pinnedByUid: actorUid,
      pinnedByName: actorName,
      expiresAtMs: deleteField(),
    });
    return;
  }

  await updateDoc(messageRef, {
    isPinned: false,
    expiresAtMs: Date.now() + LIVE_CLASS_MESSAGE_EXPIRATION_MS,
    pinnedAt: deleteField(),
    pinnedByUid: deleteField(),
    pinnedByName: deleteField(),
  });
}

export async function setLiveClassAudioMessagePinned(
  classId: string,
  messageId: string,
  pinned: boolean,
  actorUid: string,
  actorName: string,
): Promise<void> {
  await setLiveClassMessagePinned(classId, messageId, pinned, actorUid, actorName);
}

export async function purgeExpiredLiveClassMessages(classId: string): Promise<void> {
  if (!db || !classId) return;

  const messagesRef = collection(db, LIVE_CLASSES_COLLECTION, classId, 'messages');
  const expiredQuery = query(messagesRef, where('expiresAtMs', '<=', Date.now()));
  const snapshot = await getDocs(expiredQuery);
  const targets = snapshot.docs.filter((docSnap) => {
    const data = docSnap.data() as Record<string, any>;
    return data.isPinned !== true;
  });

  await Promise.all(targets.map((docSnap) => deleteDoc(docSnap.ref)));
}

export async function purgeExpiredLiveClassAudioNotes(classId: string): Promise<void> {
  await purgeExpiredLiveClassMessages(classId);
}
