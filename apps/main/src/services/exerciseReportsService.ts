import {
  QueryDocumentSnapshot,
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export const EXERCISE_REPORT_CATEGORIES = [
  'Erro de texto ou ortografia',
  'Áudio incorreto',
  'Resposta correta não aceita',
  'Alternativas incorretas ou duplicadas',
  'Tradução incorreta',
  'Exercício travado',
  'Conteúdo incompatível com a lição',
  'Outro problema',
] as const;

export type ExerciseReportCategory = typeof EXERCISE_REPORT_CATEGORIES[number];
export type ExerciseReportStatus = 'new' | 'reviewing' | 'resolved' | 'dismissed';
export type ExerciseReportPriority = 'low' | 'normal' | 'high' | 'critical';

export interface ExerciseReport {
  reportId: string;
  createdAt: any;
  updatedAt: any;
  status: ExerciseReportStatus;
  priority: ExerciseReportPriority;
  source: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  language: string;
  workbookId: number;
  workbookTitle: string;
  lessonId: string;
  lessonTitle: string;
  dayId: string;
  dayNumber: number | null;
  exerciseId: string;
  exerciseType: string;
  exerciseMode: string | null;
  sessionPhase: string;
  currentExerciseIndex: number;
  instruction: string;
  displayedText: string | null;
  audioText: string | null;
  audioSource: string | null;
  options: string[];
  expectedAnswer: string;
  acceptedAnswers: string[];
  studentAnswer: string | null;
  attemptCount: number;
  problemCategory: ExerciseReportCategory;
  studentComment: string;
  route: string;
  appVersion: string;
  browser: string;
  operatingSystem: string;
  deviceType: string;
  screenSize: string;
  adminNote: string;
  reviewedBy: string | null;
  reviewedAt: any;
  resolvedAt: any;
  dismissedAt: any;
  emailNotificationStatus: 'not_requested' | 'pending' | 'sent' | 'failed';
}

export type CreateExerciseReportInput = Omit<ExerciseReport,
  'reportId' | 'createdAt' | 'updatedAt' | 'status' | 'priority' | 'adminNote' |
  'reviewedBy' | 'reviewedAt' | 'resolvedAt' | 'dismissedAt' | 'emailNotificationStatus'>;

export interface ExerciseReportFilters {
  status?: ExerciseReportStatus | 'all';
  priority?: ExerciseReportPriority | 'all';
  workbookId?: number | null;
  lessonId?: string;
  dayId?: string;
  category?: ExerciseReportCategory | 'all';
  date?: string;
  user?: string;
  text?: string;
  sort?: 'newest' | 'oldest' | 'priority' | 'workbook';
}

export interface ExerciseReportPage {
  reports: ExerciseReport[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

const COLLECTION = 'exerciseReports';
const PAGE_SIZE = 25;
const recentSubmissions = new Map<string, { reportId: string; at: number }>();

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function reportFingerprint(input: CreateExerciseReportInput): string {
  return [input.userId, input.workbookId, input.lessonId, input.dayId, input.exerciseId,
    input.problemCategory, input.studentComment.trim().toLowerCase()].join('|');
}

export async function createExerciseReport(input: CreateExerciseReportInput): Promise<{ reportId: string; duplicate: boolean }> {
  const fingerprint = reportFingerprint(input);
  const cached = recentSubmissions.get(fingerprint);
  if (cached && Date.now() - cached.at < 15_000) return { reportId: cached.reportId, duplicate: true };

  const storageKey = `learnendo_exercise_report_dedupe:${stableHash(fingerprint)}`;
  try {
    const persisted = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null') as { reportId?: string; at?: number } | null;
    if (persisted?.reportId && persisted.at && Date.now() - persisted.at < 15_000) {
      return { reportId: persisted.reportId, duplicate: true };
    }
  } catch { /* duplicate protection remains active in memory */ }

  const timeBucket = Math.floor(Date.now() / 15_000);
  const reportId = `er_${timeBucket.toString(36)}_${stableHash(`${fingerprint}|${timeBucket}`)}`;
  recentSubmissions.set(fingerprint, { reportId, at: Date.now() });
  try { window.localStorage.setItem(storageKey, JSON.stringify({ reportId, at: Date.now() })); } catch { /* non-blocking */ }
  try {
    await setDoc(doc(db, COLLECTION, reportId), {
      ...input,
      reportId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'new',
      priority: 'normal',
      adminNote: '',
      reviewedBy: null,
      reviewedAt: null,
      resolvedAt: null,
      dismissedAt: null,
      emailNotificationStatus: 'not_requested',
    });
    window.dispatchEvent(new CustomEvent('learnendo:exercise-reports-changed'));
    return { reportId, duplicate: false };
  } catch (error) {
    recentSubmissions.delete(fingerprint);
    try { window.localStorage.removeItem(storageKey); } catch { /* non-blocking */ }
    throw error;
  }
}

const asReport = (snapshot: QueryDocumentSnapshot<DocumentData>): ExerciseReport => ({
  ...(snapshot.data() as ExerciseReport),
  reportId: snapshot.id,
});

export function filterAndSortExerciseReports(reports: ExerciseReport[], filters: ExerciseReportFilters): ExerciseReport[] {
  const user = filters.user?.trim().toLowerCase();
  const text = filters.text?.trim().toLowerCase();
  const filtered = reports.filter((report) => {
    if (filters.status && filters.status !== 'all' && report.status !== filters.status) return false;
    if (filters.priority && filters.priority !== 'all' && report.priority !== filters.priority) return false;
    if (filters.workbookId && report.workbookId !== filters.workbookId) return false;
    if (filters.lessonId && report.lessonId !== filters.lessonId) return false;
    if (filters.dayId && report.dayId !== filters.dayId) return false;
    if (filters.category && filters.category !== 'all' && report.problemCategory !== filters.category) return false;
    if (filters.date && report.createdAt?.toDate?.().toISOString().slice(0, 10) !== filters.date) return false;
    if (user && !`${report.userName ?? ''} ${report.userEmail ?? ''} ${report.userId}`.toLowerCase().includes(user)) return false;
    if (text && ![
      report.reportId, report.workbookTitle, report.lessonTitle, report.exerciseId, report.instruction,
      report.displayedText, report.expectedAnswer, report.studentAnswer, report.problemCategory, report.studentComment,
    ].join(' ').toLowerCase().includes(text)) return false;
    return true;
  });

  const priorityRank: Record<ExerciseReportPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
  return filtered.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    if (filters.sort === 'oldest') return aTime - bTime;
    if (filters.sort === 'priority') return priorityRank[a.priority] - priorityRank[b.priority] || bTime - aTime;
    if (filters.sort === 'workbook') return a.workbookId - b.workbookId || a.lessonId.localeCompare(b.lessonId) || bTime - aTime;
    return bTime - aTime;
  });
}

export async function listExerciseReports(filters: ExerciseReportFilters, cursor: QueryDocumentSnapshot<DocumentData> | null = null): Promise<ExerciseReportPage> {
  const constraints: QueryConstraint[] = [];
  // Keep server-side combinations aligned with the declared composite indexes.
  // Remaining filters are applied to the bounded page below.
  if (filters.status && filters.status !== 'all' && filters.priority && filters.priority !== 'all') {
    constraints.push(where('status', '==', filters.status), where('priority', '==', filters.priority));
  } else if (filters.workbookId && filters.lessonId) {
    constraints.push(where('workbookId', '==', filters.workbookId), where('lessonId', '==', filters.lessonId));
  } else if (filters.status && filters.status !== 'all') {
    constraints.push(where('status', '==', filters.status));
  } else if (filters.priority && filters.priority !== 'all') {
    constraints.push(where('priority', '==', filters.priority));
  }
  constraints.push(orderBy('createdAt', filters.sort === 'oldest' ? 'asc' : 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(PAGE_SIZE + 1));
  const snapshot = await getDocs(query(collection(db, COLLECTION), ...constraints));
  const pageDocs = snapshot.docs.slice(0, PAGE_SIZE);
  return {
    reports: filterAndSortExerciseReports(pageDocs.map(asReport), filters),
    cursor: pageDocs.at(-1) ?? null,
    hasMore: snapshot.docs.length > PAGE_SIZE,
  };
}

export async function getExerciseReportCounts(): Promise<Record<ExerciseReportStatus | 'total' | 'pending', number>> {
  const base = collection(db, COLLECTION);
  const [newCount, reviewing, resolved, dismissed, total] = await Promise.all([
    getCountFromServer(query(base, where('status', '==', 'new'))),
    getCountFromServer(query(base, where('status', '==', 'reviewing'))),
    getCountFromServer(query(base, where('status', '==', 'resolved'))),
    getCountFromServer(query(base, where('status', '==', 'dismissed'))),
    getCountFromServer(base),
  ]);
  const counts = {
    new: newCount.data().count,
    reviewing: reviewing.data().count,
    resolved: resolved.data().count,
    dismissed: dismissed.data().count,
    total: total.data().count,
    pending: newCount.data().count + reviewing.data().count,
  };
  return counts;
}

export function subscribePendingExerciseReportCount(onCount: (count: number) => void, onError?: (error: Error) => void): Unsubscribe {
  let active = true;
  let refreshInFlight = false;
  const refresh = async () => {
    if (!active || refreshInFlight) return;
    refreshInFlight = true;
    try { onCount((await getExerciseReportCounts()).pending); }
    catch (error) { onError?.(error as Error); }
    finally { refreshInFlight = false; }
  };
  const newestPending = query(
    collection(db, COLLECTION),
    where('status', 'in', ['new', 'reviewing']),
    orderBy('createdAt', 'desc'),
    limit(1),
  );
  const unsubscribeSnapshot = onSnapshot(newestPending, () => void refresh(), (error) => onError?.(error));
  const localRefresh = () => void refresh();
  window.addEventListener('learnendo:exercise-reports-changed', localRefresh);
  void refresh();
  return () => {
    active = false;
    unsubscribeSnapshot();
    window.removeEventListener('learnendo:exercise-reports-changed', localRefresh);
  };
}

export async function updateExerciseReport(report: ExerciseReport, patch: {
  status?: ExerciseReportStatus;
  priority?: ExerciseReportPriority;
  adminNote?: string;
}, reviewer: { uid: string; name: string }): Promise<void> {
  const updates: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  if (patch.status === 'reviewing' && report.status !== 'reviewing') {
    updates.reviewedBy = reviewer.name || reviewer.uid;
    updates.reviewedAt = serverTimestamp();
  }
  if (patch.status === 'resolved') updates.resolvedAt = serverTimestamp();
  if (patch.status === 'dismissed') updates.dismissedAt = serverTimestamp();
  await updateDoc(doc(db, COLLECTION, report.reportId), updates);
  window.dispatchEvent(new CustomEvent('learnendo:exercise-reports-changed'));
}

export const exerciseReportPageSize = PAGE_SIZE;
