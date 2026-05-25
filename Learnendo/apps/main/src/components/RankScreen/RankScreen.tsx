import React, { useEffect, useMemo, useState } from 'react';
import { subscribeToTeacherData, TeacherStudentRow } from '../../engine/teacherService';
import { rankMedal } from '../../engine/rankingService';

interface RankScreenProps {
  currentUserId?: string | null;
  courseId?: string | null;
}

export const RankScreen: React.FC<RankScreenProps> = ({ currentUserId, courseId }) => {
  // Keep ALL ranked rows so that the current user's rank is always findable,
  // even when they are outside the displayed top 10.
  const [allRows, setAllRows] = useState<TeacherStudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToTeacherData((data) => {
      setAllRows(data);
      setLoading(false);
    }, courseId);
    return unsub;
  }, [courseId]);

  // Only display the top 10, but look up the current user's rank from the full list.
  const top10 = useMemo(() => allRows.slice(0, 10), [allRows]);
  const currentUserRank = currentUserId
    ? allRows.find(r => r.uid === currentUserId)?.rank ?? null
    : null;

  return (
    <div className="min-h-screen bg-slate-900 pb-28 px-4 pt-6">
      <h1 className="text-2xl font-bold text-center text-white mb-1">🏆 Ranking</h1>
      <p className="text-center text-sm text-slate-400 mb-6">Top 10 students this season</p>

      {currentUserRank && (
        <div className="mb-4 rounded-xl bg-blue-900/60 border border-blue-700 px-4 py-3 text-center text-sm font-semibold text-blue-300">
          👉 You are ranked #{currentUserRank}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <p className="text-slate-400 text-sm">Loading ranking...</p>
        </div>
      ) : top10.length === 0 ? (
        <div className="flex justify-center items-center py-16">
          <p className="text-slate-400 text-sm">No ranking data yet. Complete some lessons to appear here!</p>
        </div>
      ) : (
        <ol className="space-y-3 max-w-md mx-auto">
          {top10.map((student) => {
            const isCurrentUser = student.uid === currentUserId;
            const medal = rankMedal(student.rank);
            const name = student.displayName ?? student.email ?? 'Anonymous';
            const pts = Math.round(student.score);

            return (
              <li
                key={student.uid}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm ${
                  isCurrentUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-100'
                }`}
              >
                {/* Rank / medal */}
                <span className="w-8 text-center text-lg font-bold flex-shrink-0">
                  {medal || student.rank}
                </span>

                {/* Name */}
                <span className="flex-1 font-semibold truncate text-sm">
                  {name}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs font-normal opacity-80">(you)</span>
                  )}
                </span>

                {/* Score */}
                <span className={`text-sm font-bold flex-shrink-0 ${isCurrentUser ? 'text-white' : 'text-blue-400'}`}>
                  {pts} pts
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-8 text-center text-xs text-slate-400">
        Score = Stars×2 + Diamonds×3 + Accuracy÷10 + Days×0.2
      </p>
    </div>
  );
};
