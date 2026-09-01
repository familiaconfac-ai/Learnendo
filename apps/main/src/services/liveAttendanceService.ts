import { doc, runTransaction, setDoc } from 'firebase/firestore';
import type { LiveClass, LiveExerciseAnswerVerdict } from '../types';
import { getSaoPauloAttendanceDay, type LiveAttendanceExercise, type LiveAttendanceRecord } from '../models/liveAttendance';
import { db } from './firebase';

const activeAttendanceIds = new Map<string, string>();

function attendanceKey(classId: string, uid: string): string {
  return `${classId}:${uid}`;
}

function attendanceRef(classId: string, uid: string) {
  return doc(db!, 'liveClasses', classId, 'presence', uid);
}

export async function startLiveAttendance(liveClass: LiveClass, uid: string): Promise<string | null> {
  if (!db || !liveClass.id || !uid) return null;
  const now = new Date();
  const date = getSaoPauloAttendanceDay(now);
  const sessionId = date.replaceAll('-', '_');
  const reference = attendanceRef(liveClass.id, uid);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const previous = snapshot.data()?.attendanceSessions?.[sessionId] as Partial<LiveAttendanceRecord> | undefined;
    const record: LiveAttendanceRecord = {
      id: sessionId,
      studentUid: uid,
      classId: liveClass.id,
      classTitle: liveClass.title,
      ...(liveClass.groupName ? { groupName: liveClass.groupName } : {}),
      ...(liveClass.courseId ? { courseId: liveClass.courseId } : {}),
      date,
      joinedAt: previous?.joinedAt ?? now.toISOString(),
      leftAt: null,
      activeSegmentStartedAt: previous?.activeSegmentStartedAt ?? now.toISOString(),
      durationSeconds: Math.max(0, Number(previous?.durationSeconds) || 0),
      workbookId: liveClass.workbookId ?? previous?.workbookId ?? null,
      lessonId: liveClass.lessonId ?? previous?.lessonId ?? null,
      grammarFocusTitles: previous?.grammarFocusTitles ?? [],
      exercises: previous?.exercises ?? {},
    };
    transaction.set(reference, { attendanceSessions: { [sessionId]: record } }, { merge: true });
  });
  activeAttendanceIds.set(attendanceKey(liveClass.id, uid), sessionId);
  return sessionId;
}

export async function finishLiveAttendance(classId: string, uid: string): Promise<void> {
  if (!db) return;
  const key = attendanceKey(classId, uid);
  const sessionId = activeAttendanceIds.get(key);
  if (!sessionId) return;
  activeAttendanceIds.delete(key);
  const reference = attendanceRef(classId, uid);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const record = snapshot.data()?.attendanceSessions?.[sessionId] as Partial<LiveAttendanceRecord> | undefined;
    if (!record) return;
    const now = new Date();
    const startedAt = record.activeSegmentStartedAt ? Date.parse(record.activeSegmentStartedAt) : NaN;
    const elapsed = Number.isFinite(startedAt) ? Math.max(0, Math.round((now.getTime() - startedAt) / 1000)) : 0;
    transaction.set(reference, {
      attendanceSessions: {
        [sessionId]: {
          leftAt: now.toISOString(),
          activeSegmentStartedAt: null,
          durationSeconds: Math.max(0, Number(record.durationSeconds) || 0) + elapsed,
        },
      },
    }, { merge: true });
  });
}

export async function recordLiveAttendanceExercise(input: {
  classId: string;
  uid: string;
  exerciseId: string;
  lessonId?: string | null;
  workbookId?: number | null;
  attempts?: number;
  verdict?: LiveExerciseAnswerVerdict;
  answeredAt?: string;
}): Promise<void> {
  if (!db || !input.exerciseId || !input.verdict) return;
  const sessionId = activeAttendanceIds.get(attendanceKey(input.classId, input.uid));
  if (!sessionId) return;
  const reference = attendanceRef(input.classId, input.uid);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const record = snapshot.data()?.attendanceSessions?.[sessionId] as Partial<LiveAttendanceRecord> | undefined;
    if (!record) return;
    const previous = record.exercises?.[input.exerciseId];
    const exercise: LiveAttendanceExercise = {
      exerciseId: input.exerciseId,
      lessonId: input.lessonId ?? previous?.lessonId ?? record.lessonId ?? null,
      workbookId: input.workbookId ?? previous?.workbookId ?? record.workbookId ?? null,
      attempts: Math.max(previous?.attempts ?? 0, input.attempts ?? 1),
      firstVerdict: previous?.firstVerdict ?? input.verdict,
      finalVerdict: input.verdict,
      answeredAt: input.answeredAt ?? new Date().toISOString(),
    };
    transaction.set(reference, {
      attendanceSessions: {
        [sessionId]: {
          ...(input.lessonId ? { lessonId: input.lessonId } : {}),
          ...(input.workbookId ? { workbookId: input.workbookId } : {}),
          exercises: { [input.exerciseId]: exercise },
        },
      },
    }, { merge: true });
  });
}

export async function recordLiveAttendanceGrammar(
  classId: string,
  uid: string,
  title: string,
  lessonId?: string | null,
): Promise<void> {
  if (!db || !title.trim()) return;
  const sessionId = activeAttendanceIds.get(attendanceKey(classId, uid));
  if (!sessionId) return;
  const reference = attendanceRef(classId, uid);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const record = snapshot.data()?.attendanceSessions?.[sessionId] as Partial<LiveAttendanceRecord> | undefined;
    if (!record) return;
    if ((record.grammarFocusTitles ?? []).includes(title.trim())) return;
    const titles = Array.from(new Set([...(record.grammarFocusTitles ?? []), title.trim()]));
    transaction.set(reference, {
      attendanceSessions: {
        [sessionId]: {
          grammarFocusTitles: titles,
          ...(lessonId ? { lessonId } : {}),
        },
      },
    }, { merge: true });
  });
}

export async function persistLiveAttendanceSnapshot(
  classId: string,
  uid: string,
  patch: Partial<Pick<LiveAttendanceRecord, 'workbookId' | 'lessonId'>>,
): Promise<void> {
  if (!db) return;
  const sessionId = activeAttendanceIds.get(attendanceKey(classId, uid));
  if (!sessionId) return;
  await setDoc(attendanceRef(classId, uid), {
    attendanceSessions: { [sessionId]: patch },
  }, { merge: true });
}
