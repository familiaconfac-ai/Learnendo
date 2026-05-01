import React, { useMemo } from 'react';
import type { BattleParticipant } from './battleTypes';
import { BattleParticipantAvatar } from './BattleParticipantAvatar';
import { compareBattleParticipantsByRanking } from './battleUtils';

type BattleUiLanguage = 'en' | 'pt' | 'es';

interface Props {
  scores: Record<string, BattleParticipant>;
  myUid: string;
  onNewBattle?: () => void;
  onClose: () => void;
  isTeacher: boolean;
  hiddenUids?: string[];
  validParticipantIds?: string[];
  uiLanguage?: BattleUiLanguage;
}

const MEDALS = ['1', '2', '3'];

const COPY: Record<BattleUiLanguage, {
  title: string;
  finishedIn: string;
  none: string;
  newBattle: string;
  close: string;
  ok: string;
  you: string;
  placementSuffix: string;
}> = {
  en: {
    title: 'Final Ranking',
    finishedIn: 'You finished in',
    none: 'No ranking recorded.',
    newBattle: 'New battle',
    close: 'Close',
    ok: 'Ok',
    you: 'you',
    placementSuffix: '',
  },
  pt: {
    title: 'Ranking Final',
    finishedIn: 'Voce terminou em',
    none: 'Nenhum ranking registrado.',
    newBattle: 'Nova batalha',
    close: 'Fechar',
    ok: 'Ok',
    you: 'voce',
    placementSuffix: 'o',
  },
  es: {
    title: 'Ranking final',
    finishedIn: 'Terminaste en',
    none: 'No hay ranking registrado.',
    newBattle: 'Nueva batalla',
    close: 'Cerrar',
    ok: 'Ok',
    you: 'tu',
    placementSuffix: 'o',
  },
};

function formatPlacementSummary(
  participant: BattleParticipant,
  fallbackIndex: number,
  uiLanguage: BattleUiLanguage,
) {
  const firstPlaces = participant.firstPlaceCount ?? 0;
  const secondPlaces = participant.secondPlaceCount ?? 0;
  const thirdPlaces = participant.thirdPlaceCount ?? 0;
  const suffix = COPY[uiLanguage].placementSuffix;
  const summaryParts = [
    firstPlaces > 0 ? `${firstPlaces}x1${suffix}` : null,
    secondPlaces > 0 ? `${secondPlaces}x2${suffix}` : null,
    thirdPlaces > 0 ? `${thirdPlaces}x3${suffix}` : null,
  ].filter(Boolean);

  if (summaryParts.length > 0) {
    return summaryParts.join(' · ');
  }

  return `${participant.lastPlacement ?? fallbackIndex + 1}${suffix}`;
}

export const BattleResultsScreen: React.FC<Props> = ({
  scores,
  myUid,
  onNewBattle,
  onClose,
  isTeacher,
  hiddenUids = [],
  validParticipantIds,
  uiLanguage = 'en',
}) => {
  const copy = COPY[uiLanguage] ?? COPY.en;

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
          <h2 className="text-xl font-bold text-white">{copy.title}</h2>
          {myRank > 0 ? (
            <p className="mt-1 text-sm text-slate-400">
              {copy.finishedIn} <span className="font-bold text-orange-400">#{myRank}</span>
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
                {index < 3 ? MEDALS[index] : `${index + 1}${copy.placementSuffix}`}
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
                {participant.uid === myUid ? <span className="ml-1 text-xs text-orange-400">({copy.you})</span> : null}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatPlacementSummary(participant, index, uiLanguage)}
              </span>
            </div>
          ))}
          {sorted.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{copy.none}</p>
          ) : null}
        </div>

        <div className="flex gap-2 px-4 py-4">
          {isTeacher && onNewBattle ? (
            <button
              onClick={onNewBattle}
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            >
              {copy.newBattle}
            </button>
          ) : null}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-600 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-400"
          >
            {isTeacher ? copy.close : copy.ok}
          </button>
        </div>
      </div>
    </div>
  );
};
