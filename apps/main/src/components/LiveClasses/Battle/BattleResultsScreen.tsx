import React, { useMemo } from 'react';
import type { BattleParticipant } from './battleTypes';
import { BattleParticipantAvatar } from './BattleParticipantAvatar';
import { compareBattleParticipantsByRanking } from './battleUtils';

interface Props {
  scores: Record<string, BattleParticipant>;
  myUid: string;
  onNewBattle?: () => void;
  onClose: () => void;
  isTeacher: boolean;
  hiddenUids?: string[];
  validParticipantIds?: string[];
}

const MEDALS = ['1º', '2º', '3º'];

function formatPlacementSummary(participant: BattleParticipant, fallbackIndex: number) {
  const firstPlaces = participant.firstPlaceCount ?? 0;
  const secondPlaces = participant.secondPlaceCount ?? 0;
  const thirdPlaces = participant.thirdPlaceCount ?? 0;
  const summaryParts = [
    firstPlaces > 0 ? `${firstPlaces}x1º` : null,
    secondPlaces > 0 ? `${secondPlaces}x2º` : null,
    thirdPlaces > 0 ? `${thirdPlaces}x3º` : null,
  ].filter(Boolean);

  if (summaryParts.length > 0) {
    return summaryParts.join(' · ');
  }

  return `${participant.lastPlacement ?? fallbackIndex + 1}º`;
}

export const BattleResultsScreen: React.FC<Props> = ({
  scores,
  myUid,
  onNewBattle,
  onClose,
  isTeacher,
  hiddenUids = [],
  validParticipantIds,
}) => {
  const sorted = useMemo(() => {
    const participantIds = new Set(validParticipantIds ?? Object.keys(scores));
      const next = Object.values(scores)
        .filter((participant) => participantIds.has(participant.uid))
        .filter((participant) => !hiddenUids.includes(participant.uid))
        .sort(compareBattleParticipantsByRanking)
        .slice(0, 10);

    console.info('[BATTLE SESSION STATUS] final ranking', {
      participantIds: Array.from(participantIds),
      ranking: next.map((participant) => ({
        uid: participant.uid,
        name: participant.name,
        placement: participant.lastPlacement ?? null,
      })),
    });

    return next;
  }, [scores, hiddenUids, validParticipantIds]);

  const myRank = sorted.findIndex((participant) => participant.uid === myUid) + 1;

  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="bg-gradient-to-b from-yellow-600/40 to-transparent py-6 text-center">
          <div className="mb-1 text-4xl">T</div>
          <h2 className="text-xl font-bold text-white">Ranking Final</h2>
          {myRank > 0 ? (
            <p className="mt-1 text-sm text-slate-400">
              Voce terminou em <span className="font-bold text-orange-400">#{myRank}</span>
            </p>
          ) : null}
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto px-4 pb-2">
          {sorted.map((participant, index) => (
            <div
              key={participant.uid}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${
                participant.uid === myUid
                  ? 'border border-orange-500/50 bg-orange-500/20'
                  : 'bg-slate-800/60'
              }`}
            >
              <span className="w-7 text-center text-sm font-bold text-white">
                {index < 3 ? MEDALS[index] : `${index + 1}º`}
              </span>
              <BattleParticipantAvatar
                name={participant.name}
                avatarId={participant.avatarId}
                isBot={participant.isBot}
                sizeClassName="h-8 w-8"
                showBotBadge
              />
              <span className="flex-1 truncate text-sm font-semibold text-white">
                {participant.name}
                {participant.uid === myUid ? <span className="ml-1 text-xs text-orange-400">(voce)</span> : null}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatPlacementSummary(participant, index)}
              </span>
            </div>
          ))}
          {sorted.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nenhum ranking registrado.</p>
          ) : null}
        </div>

        <div className="flex gap-2 px-4 py-4">
          {isTeacher && onNewBattle ? (
            <button
              onClick={onNewBattle}
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            >
              Nova batalha
            </button>
          ) : null}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-600 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-400"
          >
            {isTeacher ? 'Fechar' : 'Ok'}
          </button>
        </div>
      </div>
    </div>
  );
};
