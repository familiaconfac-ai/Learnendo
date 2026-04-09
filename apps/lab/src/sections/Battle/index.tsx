import { useState } from 'react';
import { BrandHero, BrandBar } from '../../components/Brand';
import type { AnyQuestion } from '../../engine/scoring';
import { shuffle } from '../../engine/scoring';
import { useBattle } from '../../engine/battle/useBattle';
import type { BattleState } from '../../engine/battle/useBattle';
import { QUESTION_PACKS } from '../../data/biblePacks';
import { LANGUAGE_PACKS } from '../../data/languagePacks';
import { LESSON_PACKS } from '../../data/lessonPacks';
import { buildFullLessonItems } from '../../engine/lessonBuilder';
import { MOCK_PLAYERS } from '../../data/players';
import { loadImportedPacks } from '../Import';
import Scoreboard from '../../components/Scoreboard';
import ReportButton from '../../components/ReportButton';
import { getEffectiveItem } from '../../services/reviewStore';
import type { Player, ExerciseItem, SharedPack } from '../../types';
import { getMyPacks, saveMyPack, deleteMyPack, createMyPack } from '../../services/sharedPackStore';
import { PackEditorPanel, QuestionFormPanel } from '../../components/MyPackEditor';

// ─── Pack list builder ────────────────────────────────────────────────────────

interface PackMeta {
  id: string;
  title: string;
  description: string;
  icon: string;
  questions: AnyQuestion[];
}

function buildPackList(): PackMeta[] {
  const packs: PackMeta[] = [];
  for (const lp of LESSON_PACKS) {
    const allItems = buildFullLessonItems(lp);
    packs.push({
      id: lp.id,
      title: lp.title,
      description: `${lp.description} · ${allItems.length} exercises`,
      icon: '📚',
      questions: allItems.map((item) => getEffectiveItem(item.id, lp.id, item)) as AnyQuestion[],
    });
  }
  for (const lp of LANGUAGE_PACKS) {
    packs.push({
      id: lp.id,
      title: lp.title,
      description: lp.description,
      icon: '🌐',
      questions: lp.items.map((item) => getEffectiveItem(item.id, lp.id, item)) as AnyQuestion[],
    });
  }
  for (const qp of QUESTION_PACKS) {
    packs.push({
      id: qp.id,
      title: qp.title,
      description: `Bible · ${qp.items.length} questions`,
      icon: '📖',
      questions: qp.items as AnyQuestion[],
    });
  }
  for (const lp of loadImportedPacks()) {
    const allItems = buildFullLessonItems(lp);
    packs.push({
      id: lp.id,
      title: lp.title,
      description: `Imported · ${allItems.length} exercises`,
      icon: '📥',
      questions: allItems.map((item) => getEffectiveItem(item.id, lp.id, item)) as AnyQuestion[],
    });
  }
  return packs;
}

// ─── Pack selection screen ────────────────────────────────────────────────────

function PackSelectScreen({
  onSelect,
  onBack,
}: {
  onSelect: (q: AnyQuestion[]) => void;
  onBack?: () => void;
}) {
  const packs = buildPackList();
  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto">
      <BrandHero />
      <div className="px-4">
      {onBack && (
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white w-fit mb-2">← Back</button>
      )}
      <p className="text-sm text-gray-400 mb-3">Choose a pack · Up to 8 random questions per match.</p>
      <div className="flex flex-col gap-2">
        {packs.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(shuffle(p.questions).slice(0, 8))}
            className="text-left bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 hover:bg-gray-700 active:scale-[0.98] transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{p.icon}</span>
              <div>
                <p className="font-semibold text-sm">{p.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                <p className="text-xs text-indigo-400 mt-1">
                  {Math.min(8, p.questions.length)} questions per match
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}

// ─── Lobby screen ─────────────────────────────────────────────────────────────

function LobbyScreen({
  players,
  count,
  onStart,
  onBack,
  label,
}: {
  players: Player[];
  count: number;
  onStart: () => void;
  onBack: () => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto">
      <BrandHero />
      <div className="px-4">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white w-fit mb-1">
        ← Back
      </button>
      {label && <p className="font-semibold text-sm mb-0.5">{label}</p>}
      <p className="text-sm text-gray-400">
        {count} questions · Speed bonus: up to +50 pts for fast answers
      </p>

      <div className="flex flex-col gap-2">
        {players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
            <span className="text-2xl">{p.avatarEmoji}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-gray-500">{i === 0 ? '👤 You' : '🤖 Bot'}</p>
            </div>
            {i === 0 && (
              <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] font-bold text-lg transition-all"
      >
        Start Battle ⚔️
      </button>
      </div>
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────

function getOptions(q: AnyQuestion): string[] {
  if ('options' in q && Array.isArray(q.options) && q.options.length > 0) return q.options;
  if ('type' in q && q.type === 'true-false') return ['True', 'False'];
  return [];
}

function getPrompt(q: AnyQuestion): string {
  return 'question' in q ? q.question : q.prompt;
}

function QuestionCard({
  state,
  onAnswer,
}: {
  state: BattleState;
  onAnswer: (a: string) => void;
}) {
  const { question, index, total, timeLeft, maxTime, ranking } = state;
  const options = getOptions(question);
  const prompt = getPrompt(question);
  const pct = (timeLeft / maxTime) * 100;
  const timerColor =
    timeLeft > 8 ? 'bg-green-500' : timeLeft > 4 ? 'bg-yellow-500' : 'bg-red-500';
  const timerText = timeLeft <= 4 ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto">
      <BrandBar />
      <div className="flex flex-col gap-3 px-4">
      {/* Live ranking strip */}
      <div className="flex gap-2">
        {ranking.map((entry) => (
          <div
            key={entry.player.id}
            className="flex-1 bg-gray-800 rounded-xl px-2 py-1.5 text-center min-w-0"
          >
            <p className="text-base leading-none">{entry.player.avatarEmoji}</p>
            <p className="text-xs font-bold text-indigo-300">{entry.score}</p>
          </div>
        ))}
      </div>

      {/* Timer bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${timerColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-sm font-bold tabular-nums w-5 text-right ${timerText}`}>
          {timeLeft}
        </span>
      </div>

      {/* Question progress + text */}
      <p className="text-xs text-gray-500 text-right">
        {index + 1} / {total}
      </p>
      <div className="bg-gray-800 rounded-2xl p-4 min-h-[72px] flex items-center">
        <p className="text-base font-medium leading-snug">{prompt}</p>
      </div>

      {/* Answer options -or- fill-in input */}
      {options.length > 0 ? (
      <div className="flex flex-col gap-2 pb-4">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onAnswer(opt)}
            className="w-full text-left px-4 py-3.5 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-700 hover:border-indigo-600 active:scale-[0.98] transition-all font-medium text-sm"
          >
            {opt}
          </button>
        ))}
      </div>
      ) : (
        <BattleFillIn onAnswer={onAnswer} />
      )}
      </div>
    </div>
  );
}

function BattleFillIn({ onAnswer }: { onAnswer: (v: string) => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const val = (e.currentTarget.elements.namedItem('ans') as HTMLInputElement).value;
        if (val.trim()) onAnswer(val.trim());
      }}
      className="flex gap-2 pb-4"
    >
      <input
        name="ans"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Type your answer…"
        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500 transition-colors"
      />
      <button
        type="submit"
        className="px-5 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm transition-colors active:scale-[0.95] shrink-0"
      >
        OK
      </button>
    </form>
  );
}

// ─── Feedback card ────────────────────────────────────────────────────────────

function FeedbackCard({
  state,
  players,
  onNext,
}: {
  state: BattleState;
  players: Player[];
  onNext: () => void;
}) {
  const { feedback, question, index, total } = state;
  if (!feedback) return null;

  const { humanResult, botResults } = feedback;
  const isTimeout = humanResult.answer === '__timeout__';
  const prompt = getPrompt(question);
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const isLast = index + 1 >= total;

  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto">
      <BrandBar />
      <div className="flex flex-col gap-3 px-4 pb-4">
      {/* Result banner */}
      <div
        className={`rounded-2xl px-4 py-4 border ${
          humanResult.correct
            ? 'bg-green-900/40 border-green-700'
            : 'bg-red-900/40 border-red-700'
        }`}
      >
        <p className="text-lg font-bold">
          {isTimeout ? "⏱️ Time's up!" : humanResult.correct ? '✅ Correct!' : '❌ Wrong'}
        </p>

        {humanResult.correct ? (
          <p className="text-sm mt-1 text-green-300 font-semibold">
            +{humanResult.pointsEarned} pts
            <span className="text-xs font-normal text-green-500 ml-1">
              ({(humanResult.responseTimeMs / 1000).toFixed(1)}s)
            </span>
          </p>
        ) : (
          <p className="text-sm mt-1 text-gray-300">
            Correct:{' '}
            <span className="font-semibold text-white">"{question.correctAnswer}"</span>
          </p>
        )}

        {'explanation' in question && question.explanation && (
          <p className="text-xs mt-2 text-gray-400 italic">{question.explanation}</p>
        )}
        {'reference' in question && question.reference && (
          <p className="text-xs mt-1 text-indigo-400">{String(question.reference)}</p>
        )}
      </div>

      {/* Question recap */}
      <div className="bg-gray-800 rounded-xl px-4 py-2.5">
        <p className="text-xs text-gray-500 mb-0.5">Question</p>
        <p className="text-sm">{prompt}</p>
      </div>

      {/* Bot results */}
      {botResults.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Others</p>
          {botResults.map((r) => {
            const p = playerMap[r.playerId];
            return (
              <div
                key={r.playerId}
                className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2.5"
              >
                <span className="text-base">{p?.avatarEmoji ?? '👤'}</span>
                <span className="text-sm flex-1">{p?.name}</span>
                <span
                  className={`text-sm font-semibold ${r.correct ? 'text-green-400' : 'text-red-400'}`}
                >
                  {r.correct ? `✅ +${r.pointsEarned}` : '❌'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-end px-1">
        <ReportButton
          questionId={question.id}
          originalItem={'type' in question ? (question as ExerciseItem) : undefined}
        />
      </div>

      <button
        onClick={onNext}
        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] font-bold transition-all"
      >
        {isLast ? 'See Results 🏆' : 'Next →'}
      </button>
      </div>
    </div>
  );
}

// ─── Battle runner (isolated component so the hook mounts fresh each match) ───

function BattleGame({
  questions,
  players,
  onRestart,
}: {
  questions: AnyQuestion[];
  players: Player[];
  onRestart: () => void;
}) {
  const { state, isDone, ranking, answer, next } = useBattle(questions, players);

  if (isDone) {
    return (
      <div className="max-w-md mx-auto pb-4">
        <Scoreboard ranking={ranking} onRestart={onRestart} showBrand />
      </div>
    );
  }

  if (!state) return null;

  if (state.phase === 'question') {
    return <QuestionCard state={state} onAnswer={answer} />;
  }

  return <FeedbackCard state={state} players={players} onNext={next} />;
}

// ─── Root export ─────────────────────────────────────────────────────────────

type RootMode = 'select' | 'quick' | 'custom';

export default function Battle({ initialPackId }: { initialPackId?: string }) {
  const [mode, setMode] = useState<RootMode>(() => initialPackId ? 'quick' : 'select');

  if (mode === 'quick') return <QuickBattle onBack={() => setMode('select')} initialPackId={initialPackId} />;
  if (mode === 'custom') return <CustomBattle onBack={() => setMode('select')} />;

  return <ModeSelectScreen onSelect={setMode} />;
}

// ─── Mode selection screen ────────────────────────────────────────────────────

function ModeSelectScreen({ onSelect }: { onSelect: (m: 'quick' | 'custom') => void }) {
  return (
    <div className="flex flex-col max-w-md mx-auto">
      <BrandHero />
      <div className="px-4 pb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-bold">Battle Mode</h1>
          <p className="text-xs text-gray-400 mt-0.5">Choose how you want to battle.</p>
        </div>
        <button
          onClick={() => onSelect('quick')}
          className="text-left bg-gray-800 border border-gray-700 rounded-2xl px-4 py-4 hover:bg-gray-700 active:scale-[0.98] transition-all"
        >
          <p className="text-base font-bold">⚡ Quick Battle</p>
          <p className="text-xs text-gray-400 mt-1">
            Pick a ready-made pack, face the bots, get ranked. Fast and easy.
          </p>
        </button>
        <button
          onClick={() => onSelect('custom')}
          className="text-left bg-gray-800 border border-indigo-700/60 rounded-2xl px-4 py-4 hover:bg-gray-700 active:scale-[0.98] transition-all"
        >
          <p className="text-base font-bold">🛠️ Custom Battle</p>
          <p className="text-xs text-gray-400 mt-1">
            Build your own question pack — add, edit, choose types, enable audio.
            Your packs are saved locally.
          </p>
        </button>
      </div>
    </div>
  );
}

// ─── Quick Battle ─────────────────────────────────────────────────────────────

type QuickScreen = 'pack-select' | 'lobby' | 'battle';

function QuickBattle({ onBack, initialPackId }: { onBack: () => void; initialPackId?: string }) {
  const [screen, setScreen] = useState<QuickScreen>(() => initialPackId ? 'lobby' : 'pack-select');
  const [questions, setQuestions] = useState<AnyQuestion[]>(() => {
    if (!initialPackId) return [];
    const pack = buildPackList().find((p) => p.id === initialPackId);
    return pack ? shuffle(pack.questions).slice(0, 8) : [];
  });

  if (screen === 'pack-select') {
    return (
      <PackSelectScreen
        onBack={onBack}
        onSelect={(q) => { setQuestions(q); setScreen('lobby'); }}
      />
    );
  }
  if (screen === 'lobby') {
    return (
      <LobbyScreen
        players={MOCK_PLAYERS}
        count={questions.length}
        onStart={() => setScreen('battle')}
        onBack={() => setScreen('pack-select')}
      />
    );
  }
  return (
    <BattleGame
      key={questions[0]?.id ?? 'battle'}
      questions={questions}
      players={MOCK_PLAYERS}
      onRestart={() => setScreen('pack-select')}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Custom Battle ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

type CustomScreen =
  | { view: 'list' }
  | { view: 'editor'; packId: string }
  | { view: 'add-question'; packId: string; editId?: string }
  | { view: 'lobby'; packId: string; questions: AnyQuestion[] }
  | { view: 'battle'; packId: string; questions: AnyQuestion[] };

function CustomBattle({ onBack }: { onBack: () => void }) {
  const [packs, setPacks] = useState<SharedPack[]>(() => getMyPacks());
  const [screen, setScreen] = useState<CustomScreen>({ view: 'list' });

  function reloadPacks() { setPacks(getMyPacks()); }

  function newPack() {
    const pack = createMyPack('My Pack');
    reloadPacks();
    setScreen({ view: 'editor', packId: pack.id });
  }

  function renamePack(packId: string, title: string) {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;
    saveMyPack({ ...pack, title, updatedAt: Date.now() });
    reloadPacks();
  }

  function deletePack(packId: string) {
    deleteMyPack(packId);
    reloadPacks();
    setScreen({ view: 'list' });
  }

  function saveItem(packId: string, item: ExerciseItem) {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;
    const exists = pack.items.some((i) => i.id === item.id);
    saveMyPack({
      ...pack,
      items: exists ? pack.items.map((i) => (i.id === item.id ? item : i)) : [...pack.items, item],
      updatedAt: Date.now(),
    });
    reloadPacks();
  }

  function deleteItem(packId: string, itemId: string) {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;
    saveMyPack({ ...pack, items: pack.items.filter((i) => i.id !== itemId), updatedAt: Date.now() });
    reloadPacks();
  }

  const currentPack = (id: string) => packs.find((p) => p.id === id);

  // ── Router ──────────────────────────────────────────────────────────────────

  if (screen.view === 'battle') {
    return (
      <BattleGame
        key={screen.questions[0]?.id ?? 'custom'}
        questions={screen.questions}
        players={MOCK_PLAYERS}
        onRestart={() => setScreen({ view: 'editor', packId: screen.packId })}
      />
    );
  }

  if (screen.view === 'lobby') {
    const pack = currentPack(screen.packId);
    return (
      <LobbyScreen
        players={MOCK_PLAYERS}
        count={screen.questions.length}
        onStart={() => setScreen({ view: 'battle', packId: screen.packId, questions: screen.questions })}
        onBack={() => setScreen({ view: 'editor', packId: screen.packId })}
        label={pack?.title}
      />
    );
  }

  if (screen.view === 'add-question') {
    const pack = currentPack(screen.packId);
    const editing = screen.editId ? pack?.items.find((i) => i.id === screen.editId) : undefined;
    return (
      <QuestionFormPanel
        initial={editing}
        onSave={(item) => {
          saveItem(screen.packId, item);
          setScreen({ view: 'editor', packId: screen.packId });
        }}
        onCancel={() => setScreen({ view: 'editor', packId: screen.packId })}
      />
    );
  }

  if (screen.view === 'editor') {
    const pack = currentPack(screen.packId);
    if (!pack) { setScreen({ view: 'list' }); return null; }
    return (
      <PackEditorPanel
        pack={pack}
        onBack={() => setScreen({ view: 'list' })}
        onRename={(t) => renamePack(pack.id, t)}
        onAddQuestion={() => setScreen({ view: 'add-question', packId: pack.id })}
        onEditQuestion={(id) => setScreen({ view: 'add-question', packId: pack.id, editId: id })}
        onDeleteQuestion={(id) => deleteItem(pack.id, id)}
        onDelete={() => deletePack(pack.id)}
        onStartBattle={() => {
          if (pack.items.length === 0) return;
          const qs = shuffle(pack.items as AnyQuestion[]).slice(0, 10);
          setScreen({ view: 'lobby', packId: pack.id, questions: qs });
        }}
      />
    );
  }

  // ── Pack list ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col max-w-md mx-auto">
      <BrandHero />
      <div className="px-4 pb-6 flex flex-col gap-4">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white w-fit -mt-1">← Back</button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base">🛠️ My Packs</h2>
            <p className="text-xs text-gray-400">Create and edit your own question sets.</p>
          </div>
          <button
            onClick={newPack}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors"
          >
            + New
          </button>
        </div>
        {packs.length === 0 && (
          <div className="py-8 text-center text-gray-600 text-sm">
            No packs yet. Tap "+ New" to create one, or copy a public pack from the Packs tab.
          </div>
        )}
        <div className="flex flex-col gap-2">
          {packs.map((p) => (
            <button
              key={p.id}
              onClick={() => setScreen({ view: 'editor', packId: p.id })}
              className="text-left bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 hover:bg-gray-700 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.items.length} question{p.items.length !== 1 ? 's' : ''}
                    {p.copiedFrom ? ` · 📋 copied from "${p.copiedFrom.packTitle}"` : ''}
                  </p>
                </div>
                {p.copiedFrom && (
                  <span className="text-xs text-amber-500 shrink-0">📋</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
