import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { LiveClass, LiveClassInput, LiveClassMessage } from '../types';

const LIVE_CLASSES_COLLECTION = 'liveClasses';

const mapLiveClass = (id: string, data: Record<string, any>): LiveClass => ({
  id,
  title: data.title ?? 'Untitled class',
  teacherName: data.teacherName ?? 'Teacher',
  date: data.date ?? '',
  time: data.time ?? '',
  meetingLink: data.meetingLink ?? '',
  materialLink: data.materialLink ?? '',
  whatsappLink: data.whatsappLink ?? '',
  description: data.description ?? '',
  status: data.status ?? 'upcoming',
  createdBy: data.createdBy ?? '',
  createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? undefined,
  updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt ?? undefined,
});

const mapMessage = (id: string, data: Record<string, any>): LiveClassMessage => ({
  id,
  text: data.text ?? '',
  senderUid: data.senderUid ?? '',
  senderName: data.senderName ?? 'Student',
  createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? undefined,
});

export function subscribeLiveClasses(
  onData: (classes: LiveClass[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db) {
    onData([]);
    return () => {};
  }

  const classesRef = collection(db, LIVE_CLASSES_COLLECTION);
  const classesQuery = query(classesRef, orderBy('date', 'asc'), orderBy('time', 'asc'));

  return onSnapshot(
    classesQuery,
    (snapshot) => {
      const classes = snapshot.docs.map((d) => mapLiveClass(d.id, d.data() as Record<string, any>));
      onData(classes);
    },
    (error) => {
      if (onError) onError(error);
    },
  );
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
    ...input,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, LIVE_CLASSES_COLLECTION), payload);
  return docRef.id;
}

export async function updateLiveClass(classId: string, input: Partial<LiveClassInput>): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  const classRef = doc(db, LIVE_CLASSES_COLLECTION, classId);
  await updateDoc(classRef, {
    ...input,
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
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!classId || !text.trim()) return;

  const messagesRef = collection(db, LIVE_CLASSES_COLLECTION, classId, 'messages');
  await addDoc(messagesRef, {
    text: text.trim(),
    senderUid,
    senderName,
    createdAt: serverTimestamp(),
  });
}
