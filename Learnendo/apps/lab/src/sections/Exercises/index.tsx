import { useState, useEffect } from 'react';
import { LESSON_PACKS } from '../../data/lessonPacks';
import { buildFullLessonItems } from '../../engine/lessonBuilder';
import { LANGUAGE_PACKS } from '../../data/languagePacks';
import { QUESTION_PACKS } from '../../data/biblePacks';
import { loadImportedPacks } from '../Import';
import { getEffectiveItem } from '../../services/reviewStore';
import { useQuiz } from '../../engine/useQuiz';
import { buildRanking } from '../../engine/scoring';
import { recordActivity, getRewardSnapshot, DIAMONDS_PER_EXERCISE } from '../../engine/engagement';
import QuizRunner from '../../components/QuizRunner';
import Scoreboard from '../../components/Scoreboard';
import type { AnyQuestion } from '../../engine/scoring';

const SOLO_PLAYER = { id: 'p1', name: 'You', avatarEmoji: '🧑' };

// ─── Available packs ──────────────────────────────────────────────────────────

interface PackMeta {
  id: string;
  title: string;
  icon: string;
  description: string;
  questions: AnyQuestion[];
}

function buildPacks(): PackMeta[] {
  const imported = loadImportedPacks();
  return [
    ...LESSON_PACKS.map((lp) => {
      const allItems = buildFullLessonItems(lp);
      return {
        id: lp.id,
        title: lp.title,
        icon: '📚',
        description: `${lp.description} · ${allItems.length} exercises`,
        questions: allItems.map((item) => getEffectiveItem(item.id, lp.id, item)) as AnyQuestion[],
      };
    }),
    ...LANGUAGE_PACKS.map((lp) => ({
      id: lp.id,
      title: lp.title,
      icon: '🌐',
      description: lp.description,
      questions: lp.items.map((item) => getEffectiveItem(item.id, lp.id, item)) as AnyQuestion[],
    })),
    ...QUESTION_PACKS.map((qp) => ({
      id: qp.id,
      title: qp.title,
      icon: '📖',
      description: `Bible · ${qp.items.length} questions`,
      questions: qp.items as AnyQuestion[],
    })),
    ...imported.map((lp) => {
      const allItems = buildFullLessonItems(lp);
      return {
        id: lp.id,
        title: lp.title,
        icon: '📥',
        description: `Imported · ${allItems.length} exercises`,
        questions: allItems.map((item) => getEffectiveItem(item.id, lp.id, item)) as AnyQuestion[],
      };
    }),
  ];
}

// ─── Exercise runner (remounts per pack via key prop) ─────────────────────────

function ExerciseRunner({
  packId,
  questions,
  onFinish,
}: {
  packId: string;
  questions: AnyQuestion[];
  onFinish: () => void;
}) {
  const { state, done, results, answer, next } = useQuiz(questions, SOLO_PLAYER.id);
  const [rewardBanner, setRewardBanner] = useState<{ fire: boolean; diamonds: number } | null>(null);

  // Record engagement when exercise session finishes and capture reward
  useEffect(() => {
    if (!done) return;
    const before = getRewardSnapshot();
    const fireBefore = before.fire;
    recordActivity(1);
    const after = getRewardSnapshot();
    setRewardBanner({
      fire: after.fire > fireBefore,
      diamonds: DIAMONDS_PER_EXERCISE,
    });
  }, [done]);

  if (done) {
    return (
      <div className="p-4 space-y-3">
        {rewardBanner && (
          <div className="bg-indigo-950/60 border border-indigo-700/50 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="flex gap-2 text-xl">
              {rewardBanner.fire && <span title="New fire token!">🔥</span>}
              <span title={`+${rewardBanner.diamonds} diamonds`}>💎</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-200">
                +{rewardBanner.diamonds} 💎{rewardBanner.fire ? ' · 🔥 Streak extended!' : ''}
              </p>
              <p className="text-[11px] text-gray-400">Check your progress in the ⭐ tab</p>
            </div>
          </div>
        )}
        <Scoreboard ranking={buildRanking([SOLO_PLAYER], results)} onRestart={onFinish} />
      </div>
    );
  }

  if (!state) return null;

  return (
    <div>
      <button
        onClick={onFinish}
        className="ml-4 mt-4 mb-1 text-sm text-gray-400 hover:text-white"
      >
        ← Back to packs
      </button>
      <QuizRunner state={state} onAnswer={answer} onNext={next} packId={packId} />
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function Exercises({ initialPackId }: { initialPackId?: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(initialPackId ?? null);
  const packs = buildPacks();
  const selected = packs.find((p) => p.id === selectedId);

  if (selected) {
    return (
      <div className="max-w-md mx-auto">
        {/* key forces hook remount when a different pack is chosen */}
        <ExerciseRunner
          key={selected.id}
          packId={selected.id}
          questions={selected.questions}
          onFinish={() => setSelectedId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Exercises</h1>
      <p className="text-sm text-gray-400">Choose a pack to practice.</p>
      <div className="flex flex-col gap-2">
        {packs.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className="text-left bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 hover:bg-gray-700 active:scale-[0.98] transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{p.icon}</span>
              <div>
                <p className="font-semibold text-sm">{p.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                <p className="text-xs text-indigo-400 mt-1">{p.questions.length} questions</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


