import React, { useEffect, useState } from 'react';
import { Course, UserProgress, SectionType } from '../../types';
import { LessonStats } from '../../engine/courseProgressEngine';
import { getProgressStats, formatTime, formatAccuracy, getCurrentPath } from '../../engine/progressStatsService';
import { COURSE_WORKBOOKS } from '../../courses/courseRegistry';

interface DashboardProps {
  progress: UserProgress;
  currentCourse?: Course | null;
  currentCourseId?: string | null;
  isAdmin?: boolean;
  /** Firebase UID — required to load real progress data. */
  userId?: string | null;
  currentLanguage?: 'en' | 'pt' | 'es';
  /** Authenticated user identity — shown as the student card */
  currentUser?: { displayName?: string | null; email?: string | null };
  onNavigate: (section: SectionType, params?: any) => void;
}

const DASHBOARD_LABELS = {
  en: {
    title: 'Your Progress',
    noCourse: 'No course selected',
    book: 'Book',
    currentPos: 'Current position',
    workbook: 'Workbook',
    lesson: 'Lesson',
    day: 'Day',
    fire: 'Fire',
    ice: 'Ice',
    diamonds: 'Diamonds',
    stars: 'Stars',
    sessions: 'Sessions',
    avgTime: 'Avg time',
    accuracy: 'Accuracy',
    continueBtn: (wb: number, ls: number) => `Continue — Book ${wb}, Lesson ${ls}`,
    daysDone: (n: number) => `${n}/7 days done`,
    books: 'Books',
    student: 'Student',
    anonymous: 'Anonymous',
  },
  pt: {
    title: 'Seu Progresso',
    noCourse: 'Nenhum curso selecionado',
    book: 'Livro',
    currentPos: 'Posição atual',
    workbook: 'Caderno',
    lesson: 'Lição',
    day: 'Dia',
    fire: 'Fogo',
    ice: 'Gelo',
    diamonds: 'Diamantes',
    stars: 'Estrelas',
    sessions: 'Sessões',
    avgTime: 'Tempo médio',
    accuracy: 'Precisão',
    continueBtn: (wb: number, ls: number) => `Continuar — Livro ${wb}, Lição ${ls}`,
    daysDone: (n: number) => `${n}/7 dias feitos`,
    books: 'Livros',
    student: 'Aluno',
    anonymous: 'Anônimo',
  },
  es: {
    title: 'Tu Progreso',
    noCourse: 'Ningún curso seleccionado',
    book: 'Libro',
    currentPos: 'Posición actual',
    workbook: 'Cuaderno',
    lesson: 'Lección',
    day: 'Día',
    fire: 'Fuego',
    ice: 'Hielo',
    diamonds: 'Diamantes',
    stars: 'Estrellas',
    sessions: 'Sesiones',
    avgTime: 'Tiempo medio',
    accuracy: 'Precisión',
    continueBtn: (wb: number, ls: number) => `Continuar — Libro ${wb}, Lección ${ls}`,
    daysDone: (n: number) => `${n}/7 días hechos`,
    books: 'Libros',
    student: 'Estudiante',
    anonymous: 'Anónimo',
  },
} as const;

export const Dashboard: React.FC<DashboardProps> = ({
  progress,
  currentCourse,
  currentCourseId,
  isAdmin = false,
  userId,
  currentLanguage = 'en',
  currentUser,
  onNavigate,
}) => {
  const L = DASHBOARD_LABELS[currentLanguage] ?? DASHBOARD_LABELS.en;
  const [stats, setStats] = useState<LessonStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const resolvedCourseId = currentCourse?.id ?? currentCourseId ?? 'english';
  const availableWorkbookIds = Object.keys(COURSE_WORKBOOKS[resolvedCourseId] ?? COURSE_WORKBOOKS.english)
    .map(Number)
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b);

  /**
   * Load the current lesson's stats from Firestore whenever the
   * user, course, or lesson position changes.
   */
  useEffect(() => {
    if (!userId || !currentCourse?.id) {
      setStats(null);
      return;
    }

    let cancelled = false;
    setLoadingStats(true);

    getProgressStats(userId, currentCourse.id, progress.currentWorkbook, progress.currentLesson)
      .then(stats => { if (!cancelled) setStats(stats); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoadingStats(false); });

    return () => { cancelled = true; };
  }, [userId, currentCourse?.id, progress.currentWorkbook, progress.currentLesson]);

  const path = getCurrentPath(progress);

  return (
    <div className="min-h-screen bg-blue-50 pb-28 px-4 pt-6">
      {/* ── Header ──────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-blue-900 mb-1">{L.title}</h1>
      <p className="text-sm text-slate-500 mb-4">
        {currentCourse?.title ?? L.noCourse} · {L.book} {progress.currentWorkbook}
      </p>

      {/* ── Student identity card ───────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm px-5 py-3 mb-4 flex items-center gap-3">
        <span className="text-2xl">👤</span>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{L.student}</p>
          <p className="text-sm font-bold text-slate-800 truncate">
            {currentUser?.displayName ?? L.anonymous}
          </p>
          {currentUser?.email && (
            <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
          )}
        </div>
      </div>

      {/* ── Current position card ───────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm px-5 py-4 mb-4 flex items-center gap-4">
        <span className="text-2xl">📍</span>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{L.currentPos}</p>
          <p className="text-base font-bold text-slate-800">
            {L.workbook} {path.workbook} · {L.lesson} {path.lesson} · {L.day} {path.day}
          </p>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────── */}
      <div className="flex justify-around bg-white rounded-2xl shadow-sm px-4 py-4 mb-4">
        <StatBadge emoji="🔥" label={L.fire}     value={loadingStats ? '…' : String(stats?.fire     ?? 0)} />
        <StatBadge emoji="❄️"  label={L.ice}      value={loadingStats ? '…' : String(stats?.ice      ?? 0)} />
        <StatBadge emoji="💎" label={L.diamonds} value={loadingStats ? '…' : String(stats?.diamonds ?? 0)} />
        <StatBadge emoji="⭐" label={L.stars}    value={loadingStats ? '…' : String(stats?.stars    ?? 0)} />
      </div>

      {/* ── Analytics row ─────────────────────────────────── */}
      {(stats?.sessions ?? 0) > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <AnalyticsBadge label={L.sessions}  value={String(stats!.sessions)} />
          <AnalyticsBadge label={L.avgTime}   value={formatTime(stats!.avgTimeSpent)} />
          <AnalyticsBadge label={L.accuracy}  value={formatAccuracy(stats!.avgAccuracy)} />
        </div>
      )}

      {/* ── Continue button ──────────────────────────── */}
      <button
        className="w-full bg-blue-500 text-white font-bold py-3 rounded-2xl shadow-[0_4px_0_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-transform mb-6"
        onClick={() => onNavigate(SectionType.WORKBOOK, { workbookId: progress.currentWorkbook })}
      >
        {L.continueBtn(progress.currentWorkbook, progress.currentLesson)}
        {(stats?.totalCompleted ?? 0) > 0 && (
          <span className="ml-2 text-blue-200 font-normal text-sm">
            ({L.daysDone(stats!.totalCompleted)})
          </span>
        )}
      </button>

      {/* ── Books grid ────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">{L.books}</h2>
      <div className="grid grid-cols-4 gap-3">
        {availableWorkbookIds.map(bookNum => {
          const isCompleted = bookNum < progress.currentWorkbook;
          const isCurrent   = bookNum === progress.currentWorkbook;
          const isLocked    = !isAdmin && bookNum > progress.currentWorkbook;

          return (
            <button
              key={bookNum}
              disabled={isLocked}
              onClick={() => onNavigate(SectionType.WORKBOOK, { workbookId: bookNum })}
              className={[
                'relative flex flex-col items-center justify-center rounded-2xl py-4 font-bold text-sm transition-transform active:scale-95',
                isLocked
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-inner'
                  : isCompleted
                  ? 'bg-green-400 text-white shadow-[0_4px_0_0_#16a34a]'
                  : isCurrent
                  ? 'bg-blue-500 text-white shadow-[0_4px_0_0_#1d4ed8]'
                  : 'bg-white text-slate-700 shadow-sm',
              ].join(' ')}
            >
              <span className="text-lg mb-1">
                {isLocked ? '🔒' : isCompleted ? '✅' : isCurrent ? '📖' : '📘'}
              </span>
              <span>{L.book} {bookNum}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Internal sub-components ──────────────────────────────────────────

const StatBadge: React.FC<{ emoji: string; label: string; value: string }> = ({ emoji, label, value }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-2xl">{emoji}</span>
    <span className="text-lg font-bold text-slate-800">{value}</span>
    <span className="text-xs text-slate-500">{label}</span>
  </div>
);

const AnalyticsBadge: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col items-center justify-center bg-white rounded-2xl py-3 px-2 shadow-sm overflow-hidden">
    <span className="text-base font-bold text-slate-800 truncate w-full text-center">{value}</span>
    <span className="text-xs text-slate-500 mt-0.5 truncate w-full text-center">{label}</span>
  </div>
);
