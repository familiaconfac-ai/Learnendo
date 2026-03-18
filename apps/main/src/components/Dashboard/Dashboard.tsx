import React, { useEffect, useState } from 'react';
import { Course, UserProgress, SectionType } from '../../types';
import {
  getLessonProgress,
  rebuildLessonStats,
  LessonStats,
} from '../../engine/courseProgressEngine';

interface DashboardProps {
  progress: UserProgress;
  currentCourse?: Course | null;
  isAdmin?: boolean;
  /** Firebase UID — required to load real progress data. */
  userId?: string | null;
  onNavigate: (section: SectionType, params?: any) => void;
}

const TOTAL_BOOKS = 8;

export const Dashboard: React.FC<DashboardProps> = ({
  progress,
  currentCourse,
  isAdmin = false,
  userId,
  onNavigate,
}) => {
  const [stats, setStats] = useState<LessonStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

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

    getLessonProgress(userId, currentCourse.id, progress.currentWorkbook, progress.currentLesson)
      .then(lesson => {
        if (cancelled) return;
        setStats(lesson ? rebuildLessonStats(lesson) : null);
      })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoadingStats(false); });

    return () => { cancelled = true; };
  }, [userId, currentCourse?.id, progress.currentWorkbook, progress.currentLesson]);

  return (
    <div className="min-h-screen bg-blue-50 pb-28 px-4 pt-6">
      {/* ── Header ──────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-blue-900 mb-1">Your Progress</h1>
      <p className="text-sm text-slate-500 mb-6">
        {currentCourse?.title ?? 'No course selected'} · Book {progress.currentWorkbook}
      </p>

      {/* ── Stats row ───────────────────────────────── */}
      <div className="flex justify-around bg-white rounded-2xl shadow-sm px-4 py-4 mb-6">
        <StatBadge emoji="🔥" label="Fire"     value={loadingStats ? '…' : String(stats?.fire     ?? 0)} />
        <StatBadge emoji="❄️"  label="Ice"      value={loadingStats ? '…' : String(stats?.ice      ?? 0)} />
        <StatBadge emoji="💎" label="Diamonds" value={loadingStats ? '…' : String(stats?.diamonds ?? 0)} />
        <StatBadge emoji="⭐" label="Stars"    value={loadingStats ? '…' : String(stats?.stars    ?? 0)} />
      </div>

      {/* ── Continue button ──────────────────────────── */}
      <button
        className="w-full bg-blue-500 text-white font-bold py-3 rounded-2xl shadow-[0_4px_0_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-transform mb-6"
        onClick={() => onNavigate(SectionType.WORKBOOK, { workbookId: progress.currentWorkbook })}
      >
        Continue — Book {progress.currentWorkbook}, Lesson {progress.currentLesson}
        {(stats?.totalCompleted ?? 0) > 0 && (
          <span className="ml-2 text-blue-200 font-normal text-sm">
            ({stats!.totalCompleted}/7 days done)
          </span>
        )}
      </button>

      {/* ── Books grid ────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Books</h2>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: TOTAL_BOOKS }, (_, i) => i + 1).map(bookNum => {
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
              <span>Book {bookNum}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Internal sub-component ────────────────────────────────────

const StatBadge: React.FC<{ emoji: string; label: string; value: string }> = ({ emoji, label, value }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-2xl">{emoji}</span>
    <span className="text-lg font-bold text-slate-800">{value}</span>
    <span className="text-xs text-slate-500">{label}</span>
  </div>
);
