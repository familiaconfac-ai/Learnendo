import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BattleParticipant } from './battleTypes';
import { BattleParticipantAvatar } from './BattleParticipantAvatar';
import { compareBattleParticipantsByRanking } from './battleUtils';
import { createBattlePodiumAudio, type ManagedBattleAudio } from './battleAudio';

type BattleUiLanguage = 'en' | 'pt' | 'es';

interface Props {
  scores: Record<string, BattleParticipant>;
  myUid: string;
  totalQuestions?: number;
  onNewBattle?: () => void;
  onClose: () => void;
  isTeacher: boolean;
  hiddenUids?: string[];
  validParticipantIds?: string[];
  uiLanguage?: BattleUiLanguage;
  closeLabel?: string;
  resultActions?: BattleResultAction[];
}

export interface BattleResultAction {
  id: string;
  label: string;
  onClick: () => void | Promise<void>;
  primary?: boolean;
  disabled?: boolean;
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
}> = {
  en: {
    title: 'Final Ranking',
    finishedIn: 'You finished in',
    none: 'No ranking recorded.',
    newBattle: 'New battle',
    close: 'Close',
    ok: 'Ok',
    you: 'you',
  },
  pt: {
    title: 'Ranking Final',
    finishedIn: 'Voce terminou em',
    none: 'Nenhum ranking registrado.',
    newBattle: 'Nova batalha',
    close: 'Fechar',
    ok: 'Ok',
    you: 'voce',
  },
  es: {
    title: 'Ranking final',
    finishedIn: 'Terminaste en',
    none: 'No hay ranking registrado.',
    newBattle: 'Nueva batalla',
    close: 'Cerrar',
    ok: 'Ok',
    you: 'tu',
  },
};

function formatResultSummary(participant: BattleParticipant, totalQuestions?: number) {
  const correctAnswers = participant.correctAnswersCount ?? 0;
  if (totalQuestions && totalQuestions > 0) {
    return `${correctAnswers}/${totalQuestions}`;
  }
  return String(correctAnswers);
}

function formatPointsSummary(participant: BattleParticipant) {
  return `${(participant.score ?? 0).toLocaleString()} pts`;
}

export const BattleResultsScreen: React.FC<Props> = ({
  scores,
  myUid,
  totalQuestions,
  onNewBattle,
  onClose,
  isTeacher,
  hiddenUids = [],
  validParticipantIds,
  uiLanguage = 'en',
  closeLabel,
  resultActions,
}) => {
  const copy = COPY[uiLanguage] ?? COPY.en;
  const audioRef = useRef<ManagedBattleAudio | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);

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
        correctAnswersCount: participant.correctAnswersCount ?? 0,
      })),
    });

    return next;
  }, [scores, hiddenUids, validParticipantIds]);

  const myRank = sorted.findIndex((participant) => participant.uid === myUid) + 1;
  const podium = [sorted[1] ?? null, sorted[0] ?? null, sorted[2] ?? null];

  useEffect(() => {
    const audio = createBattlePodiumAudio(0.45);
    audioRef.current = audio;
    audio?.start();
    return () => {
      audio?.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowConfetti(false), 2_200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <style>{`
        @keyframes battle-confetti-fall { from { transform: translate3d(0,-15vh,0) rotate(0deg); opacity: 1; } to { transform: translate3d(var(--drift),105vh,0) rotate(620deg); opacity: 0; } }
        @keyframes battle-avatar-bob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-7px) rotate(2deg); } }
        @keyframes battle-avatar-winner { 0%,100% { transform: translateY(0) scale(1); } 45% { transform: translateY(-10px) scale(1.06); } }
        .battle-confetti { animation: battle-confetti-fall 1.8s ease-in forwards; }
        .battle-avatar-celebrate { animation: battle-avatar-bob 1.9s ease-in-out infinite; }
        .battle-avatar-winner { animation: battle-avatar-winner 1.45s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .battle-confetti, .battle-avatar-celebrate, .battle-avatar-winner { animation: none !important; }
          .battle-confetti { display: none; }
        }
      `}</style>
      {showConfetti ? (
        <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
          {Array.from({ length: 28 }, (_, index) => (
            <span
              key={index}
              className="battle-confetti absolute top-0 h-3 w-2 rounded-sm"
              style={{
                left: `${(index * 37) % 100}%`,
                backgroundColor: ['#facc15', '#fb7185', '#38bdf8', '#4ade80', '#c084fc'][index % 5],
                animationDelay: `${(index % 9) * 0.07}s`,
                ['--drift' as string]: `${((index % 7) - 3) * 18}px`,
              }}
            />
          ))}
        </div>
      ) : null}
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

        <div className="relative overflow-hidden px-4 pb-2">
          <div className="pointer-events-none absolute inset-x-4 top-2 flex justify-between text-xl opacity-60">
            <span>o</span>
            <span>*</span>
            <span>o</span>
            <span>*</span>
            <span>o</span>
          </div>
          <div className="mt-4 grid grid-cols-3 items-end gap-3">
            {podium.map((participant, index) => {
              const visualOrder = index === 1 ? 1 : index === 0 ? 2 : 3;
              const heightClass = index === 1 ? 'h-28' : index === 0 ? 'h-20' : 'h-16';
              return (
                <div key={participant?.uid ?? `podium-${index}`} className="flex flex-col items-center">
                  {participant ? (
                    <>
                      <BattleParticipantAvatar
                        name={participant.name}
                        avatarId={participant.avatarId}
                        isBot={participant.isBot}
                        sizeClassName={index === 1 ? 'h-20 w-20' : 'h-16 w-16'}
                        iconClassName={index === 1 ? 'text-6xl leading-none' : 'text-5xl leading-none'}
                        className={index === 1 ? 'battle-avatar-winner' : 'battle-avatar-celebrate'}
                        showBotBadge
                      />
                      <p className="mt-2 max-w-[88px] truncate text-center text-xs font-bold text-white">
                        {participant.name}
                      </p>
                    </>
                  ) : (
                    <div className="h-[84px]" />
                  )}
                  <div className={`mt-2 flex w-full items-center justify-center rounded-t-2xl bg-gradient-to-b from-orange-500/80 to-orange-700/90 ${heightClass}`}>
                    <span className="text-2xl font-black text-white">{participant ? visualOrder : '-'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto px-4 pb-2 pt-4">
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
                {index < 3 ? MEDALS[index] : `${index + 1}`}
              </span>
              <BattleParticipantAvatar
                name={participant.name}
                avatarId={participant.avatarId}
                isBot={participant.isBot}
                sizeClassName="h-8 w-8"
                iconClassName="text-2xl leading-none"
                showBotBadge
              />
              <span className="flex-1 truncate text-sm font-semibold text-white">
                {participant.name}
                {participant.uid === myUid ? <span className="ml-1 text-xs text-orange-400">({copy.you})</span> : null}
              </span>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-slate-300">
                  {formatResultSummary(participant, totalQuestions)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {formatPointsSummary(participant)}
                </div>
              </div>
            </div>
          ))}
          {sorted.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{copy.none}</p>
          ) : null}
        </div>

        <div className={`px-4 py-4 ${resultActions?.length ? 'grid gap-2 sm:grid-cols-3' : 'flex gap-2'}`}>
          {resultActions?.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => void action.onClick()}
              disabled={action.disabled}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                action.primary
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90'
                  : 'border border-slate-600 text-slate-200 hover:border-slate-400'
              }`}
            >
              {action.label}
            </button>
          ))}
          {!resultActions?.length ? (
            <>
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
            {closeLabel || (isTeacher ? copy.close : copy.ok)}
          </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
