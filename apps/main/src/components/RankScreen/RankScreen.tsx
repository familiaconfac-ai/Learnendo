import React, { useEffect, useState } from 'react';
import { subscribeToTeacherData, TeacherStudentRow } from '../../engine/teacherService';
import { rankMedal } from '../../engine/rankingService';

interface RankScreenProps {
  currentUserId?: string | null;
}

export const RankScreen: React.FC<RankScreenProps> = ({ currentUserId }) => {
  const [rows, setRows] = useState<TeacherStudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToTeacherData((data) => {
      setRows(data.slice(0, 10)); // top 10
      setLoading(false);
    });
    return unsub;
  }, []);

  const currentUserRank = currentUserId
    ? rows.find(r => r.uid === currentUserId)?.rank ?? null
    : null;

  return (
    <div className="min-h-screen bg-blue-50 pb-28 px-4 pt-6">
      <h1 className="text-2xl font-bold text-center text-blue-900 mb-1">🏆 Ranking</h1>
      <p className="text-center text-sm text-slate-500 mb-6">Top 10 students this season</p>

      {currentUserRank && (
        <div className="mb-4 rounded-xl bg-blue-100 border border-blue-300 px-4 py-3 text-center text-sm font-semibold text-blue-800">
          👉 You are ranked #{currentUserRank}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <p className="text-slate-400 text-sm">Loading ranking...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex justify-center items-center py-16">
          <p className="text-slate-400 text-sm">No ranking data yet. Complete some lessons to appear here!</p>
        </div>
      ) : (
        <ol className="space-y-3 max-w-md mx-auto">
          {rows.map((student) => {
            const isCurrentUser = student.uid === currentUserId;
            const medal = rankMedal(student.rank);
            const name = student.displayName ?? student.email ?? 'Anonymous';
            const pts = Math.round(student.score);

            return (
              <li
                key={student.uid}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm ${
                  isCurrentUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-slate-800'
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
                <span className={`text-sm font-bold flex-shrink-0 ${isCurrentUser ? 'text-white' : 'text-blue-600'}`}>
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
