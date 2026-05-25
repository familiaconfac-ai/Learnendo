// ── Learnendo Battle — Results Screen ─────────────────────────────────────────
import React, { useMemo } from 'react';
import type { BattleParticipant } from './battleTypes';

interface Props {
  scores: Record<string, BattleParticipant>;
  myUid: string;
  onNewBattle?: () => void; // teacher-only
  onClose: () => void;
  isTeacher: boolean;
  hiddenUids?: string[];
}

const MEDALS = ['🥇', '🥈', '🥉'];

export const BattleResultsScreen: React.FC<Props> = ({
  scores, myUid, onNewBattle, onClose, isTeacher, hiddenUids = []
}) => {
  const sorted = useMemo(
    () => Object.values(scores)
      .filter((participant) => !hiddenUids.includes(participant.uid))
      .sort((a, b) => b.score - a.score),
    [scores, hiddenUids]
  );

  const myRank = sorted.findIndex(p => p.uid === myUid) + 1;

  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="text-center py-6 bg-gradient-to-b from-yellow-600/40 to-transparent">
          <div className="text-4xl mb-1">🏆</div>
          <h2 className="text-xl font-bold text-white">Battle Over!</h2>
          {myRank > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              You finished <span className="text-orange-400 font-bold">#{myRank}</span>
            </p>
          )}
        </div>

        {/* Podium */}
        <div className="px-4 pb-2 space-y-2 max-h-72 overflow-y-auto">
          {sorted.map((p, i) => (
            <div
              key={p.uid}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${
                p.uid === myUid
                  ? 'bg-orange-500/20 border border-orange-500/50'
                  : 'bg-slate-800/60'
              }`}
            >
              <span className="text-xl w-7 text-center">
                {i < 3 ? MEDALS[i] : `#${i + 1}`}
              </span>
              <span className="flex-1 text-sm font-semibold text-white truncate">
                {p.name}
                {p.uid === myUid && <span className="text-orange-400 text-xs ml-1">(you)</span>}
              </span>
              <span className="text-orange-400 font-bold text-sm">
                {p.score.toLocaleString()} pts
              </span>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-center text-slate-500 py-6 text-sm">No scores recorded.</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-4 flex gap-2">
          {isTeacher && onNewBattle && (
            <button
              onClick={onNewBattle}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm hover:opacity-90 transition"
            >
              ⚔️ New Battle
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-semibold text-sm hover:border-slate-400 transition"
          >
            {isTeacher ? '✕ Close' : '👍 Nice!'}
          </button>
        </div>
      </div>
    </div>
  );
};
