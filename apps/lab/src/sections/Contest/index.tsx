import { useState } from 'react';
import { BrandHero, BrandBar } from '../../components/Brand';
import { useContest } from '../../engine/contest/useContest';
import type { ContestState } from '../../engine/contest/useContest';
import { QUESTION_PACKS } from '../../data/biblePacks';
import { LANGUAGE_PACKS } from '../../data/languagePacks';
import { ALL_CONTEST_TEAMS } from '../../data/mock/contestTeams';
import { shuffle } from '../../engine/scoring';
import type { AnyQuestion } from '../../engine/scoring';
import type { ContestTeam, TeamScore, ExerciseItem } from '../../types';
import ReportButton from '../../components/ReportButton';
import { getEffectiveItem } from '../../services/reviewStore';

// ─── Pack meta (reuses same pattern as Battle) ────────────────────────────────

interface PackMeta {
  id: string;
  title: string;
  icon: string;
  description: string;
  questions: AnyQuestion[];
}

function buildPacks(): PackMeta[] {
  return [
    ...QUESTION_PACKS.map((qp) => ({
      id: qp.id, title: qp.title, icon: '📖',
      description: `Bible · ${qp.items.length} questions`,
      questions: qp.items as AnyQuestion[],
    })),
    ...LANGUAGE_PACKS.map((lp) => ({
      id: lp.id, title: lp.title, icon: '🌐',
      description: lp.description,
      questions: lp.items.map((item) => getEffectiveItem(item.id, lp.id, item)) as AnyQuestion[],
    })),
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPrompt(q: AnyQuestion): string {
  return 'question' in q ? q.question : q.prompt;
}

function getOptions(q: AnyQuestion): string[] {
  if ('options' in q && Array.isArray(q.options) && q.options.length > 0) return q.options;
  return [];
}

// ─── Screen 1: Pack Select ────────────────────────────────────────────────────

function PackSelectScreen({ onSelect }: { onSelect: (q: AnyQuestion[]) => void }) {
  const packs = buildPacks();
  return (
    <div className="flex flex-col max-w-md mx-auto">
      <BrandHero />
      <div className="px-4 pb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-bold">Contest Mode</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Host-controlled · Teams · Live scoreboard
          </p>
        </div>
        <p className="text-sm text-gray-400">Choose a question pack:</p>
        <div className="flex flex-col gap-2">
          {packs.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(shuffle(p.questions))}
              className="text-left bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 hover:bg-gray-700 active:scale-[0.98] transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{p.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: Team Setup ────────────────────────────────────────────────────

function TeamSetupScreen({
  selected,
  onToggle,
  onStart,
  onBack,
}: {
  selected: ContestTeam[];
  onToggle: (t: ContestTeam) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col max-w-md mx-auto">
      <BrandHero />
      <div className="px-4 pb-6 flex flex-col gap-4">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white w-fit -mt-1">
          ← Back
        </button>
        <div>
          <h2 className="text-lg font-bold">Teams</h2>
          <p className="text-xs text-gray-400 mt-0.5">Select 2–4 teams to compete.</p>
        </div>

        <div className="flex flex-col gap-2">
          {ALL_CONTEST_TEAMS.map((t) => {
            const isOn = selected.some((s) => s.id === t.id);
            return (
              <button
                key={t.id}
                onClick={() => onToggle(t)}
                className={[
                  'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-[0.98]',
                  isOn
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-gray-700 bg-gray-800 opacity-60',
                ].join(' ')}
              >
                <span className="text-2xl">{t.emoji}</span>
                <span className="font-semibold text-sm flex-1 text-left">{t.name}</span>
                <span className="text-lg">{isOn ? '✅' : '⬜'}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onStart}
          disabled={selected.length < 2}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg transition-all active:scale-[0.98]"
        >
          Start Contest 🏆
        </button>
        {selected.length < 2 && (
          <p className="text-xs text-gray-500 text-center -mt-2">
            Select at least 2 teams to start.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Live scoreboard strip ─────────────────────────────────────────────────

function ScoreStrip({ scores }: { scores: TeamScore[] }) {
  const max = Math.max(...scores.map((s) => s.score), 1);
  return (
    <div className="flex gap-1.5">
      {scores.map((s) => (
        <div
          key={s.team.id}
          className="flex-1 bg-gray-800 rounded-xl px-2 py-2 text-center min-w-0 overflow-hidden"
        >
          <p className="text-base leading-none">{s.team.emoji}</p>
          <p className={`text-sm font-bold mt-0.5 ${s.team.textColor}`}>{s.score}</p>
          {/* mini progress bar */}
          <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${s.team.color} transition-all duration-500`}
              style={{ width: `${Math.round((s.score / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ index, total }: { index: number; total: number }) {
  const pct = Math.round(((index + 1) / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 shrink-0">
        {index + 1} / {total}
      </span>
    </div>
  );
}

// ─── Screen 3: Question phase ────────────────────────────────────────────────

function QuestionScreen({
  state,
  onReveal,
}: {
  state: ContestState;
  onReveal: () => void;
}) {
  const { question, index, total, teamScores } = state;
  const prompt = getPrompt(question);
  const options = getOptions(question);

  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto">
      <BrandBar />
      <div className="flex flex-col gap-3 px-4 pb-4">
        <ScoreStrip scores={teamScores} />
        <ProgressBar index={index} total={total} />

        <div className="bg-gray-800 rounded-2xl p-5 min-h-[88px] flex items-center">
          <p className="text-base font-semibold leading-snug">{prompt}</p>
        </div>

        {options.length > 0 && (
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <div
                key={opt}
                className="px-4 py-3 rounded-xl border border-gray-700 bg-gray-900 text-sm font-medium text-gray-200"
              >
                {opt}
              </div>
            ))}
          </div>
        )}

        {options.length === 0 && (
          <p className="text-xs text-gray-500 italic text-center">
            Fill-in question — host decides who answered correctly.
          </p>
        )}

        <button
          onClick={onReveal}
          className="mt-2 w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] font-bold text-base transition-all shadow-[0_0_0_4px_rgba(245,158,11,0.2)] hover:shadow-[0_0_0_6px_rgba(245,158,11,0.3)]"
        >
          Reveal Answer 👁️
        </button>
      </div>
    </div>
  );
}

// ─── Screen 4: Reveal + host scoring ─────────────────────────────────────────

function RevealScreen({
  state,
  onToggle,
  onConfirm,
}: {
  state: ContestState;
  onToggle: (teamId: string) => void;
  onConfirm: () => void;
}) {
  const { question, index, total, roundCorrectTeams, teamScores } = state;
  const prompt = getPrompt(question);
  const options = getOptions(question);
  const isLast = index + 1 >= total;
  const pointsPreview = roundCorrectTeams.length * 100;

  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto">
      <BrandBar />
      <div className="flex flex-col gap-3 px-4 pb-4">
        <ScoreStrip scores={teamScores} />
        <ProgressBar index={index} total={total} />

        {/* Question recap */}
        <div className="bg-gray-800 rounded-xl px-4 py-2.5">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Question</p>
          <p className="text-sm mt-1 leading-snug">{prompt}</p>
        </div>

        {/* Options with correct highlighted */}
        {options.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {options.map((opt) => {
              const isCorrect = opt === question.correctAnswer;
              return (
                <div
                  key={opt}
                  className={[
                    'px-4 py-3 rounded-xl border text-sm font-medium transition-colors',
                    isCorrect
                      ? 'border-green-500 bg-green-900/40 text-green-300'
                      : 'border-gray-700 bg-gray-900 opacity-50',
                  ].join(' ')}
                >
                  {isCorrect ? '✅ ' : ''}{opt}
                </div>
              );
            })}
          </div>
        )}

        {/* Fill-in: show the correct answer */}
        {options.length === 0 && (
          <div className="bg-green-900/30 border border-green-700 rounded-xl px-4 py-3">
            <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">Correct answer</p>
            <p className="text-sm font-bold text-green-300 mt-0.5">{question.correctAnswer}</p>
          </div>
        )}

        {'explanation' in question && question.explanation && (
          <p className="text-xs text-gray-400 italic px-1">{question.explanation}</p>
        )}
        {'reference' in question && question.reference && (
          <p className="text-xs text-indigo-400 px-1">{String(question.reference)}</p>
        )}

        {/* Host scores which teams got it right */}
        <div className="border border-gray-700 rounded-2xl p-3 flex flex-col gap-2 mt-1">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
            Who got it right? Tap to mark ↓
          </p>
          <div className="flex flex-col gap-2">
            {teamScores.map(({ team }) => {
              const marked = roundCorrectTeams.includes(team.id);
              return (
                <button
                  key={team.id}
                  onClick={() => onToggle(team.id)}
                  className={[
                    'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-[0.98] font-medium text-sm',
                    marked
                      ? `${team.color} border-transparent text-white`
                      : 'border-gray-600 bg-gray-800 text-gray-300',
                  ].join(' ')}
                >
                  <span className="text-xl">{team.emoji}</span>
                  <span className="flex-1 text-left">{team.name}</span>
                  {marked ? (
                    <span className="text-base">✅ +100</span>
                  ) : (
                    <span className="text-base opacity-50">❌</span>
                  )}
                </button>
              );
            })}
          </div>
          {pointsPreview > 0 && (
            <p className="text-xs text-green-400 text-center">
              {roundCorrectTeams.length} team{roundCorrectTeams.length !== 1 ? 's' : ''} will
              receive +{pointsPreview} pts total
            </p>
          )}
        </div>

        <div className="flex items-center justify-end px-1">
          <ReportButton
            questionId={question.id}
            originalItem={'type' in question ? (question as ExerciseItem) : undefined}
          />
        </div>

        <button
          onClick={onConfirm}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] font-bold text-base transition-all"
        >
          {isLast ? 'Finish Contest 🏆' : 'Next Question →'}
        </button>
      </div>
    </div>
  );
}

// ─── Screen 5: Final scoreboard ───────────────────────────────────────────────

function FinalScreen({
  scores,
  onRestart,
}: {
  scores: TeamScore[];
  onRestart: () => void;
}) {
  const medals = ['🥇', '🥈', '🥉', '🏅'];
  return (
    <div className="flex flex-col max-w-md mx-auto">
      <BrandHero />
      <div className="px-4 pb-6 flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-center">🏆 Final Results</h2>
        <p className="text-sm text-gray-400 text-center -mt-2">Contest complete!</p>
        <div className="flex flex-col gap-2">
          {scores.map((s, i) => (
            <div
              key={s.team.id}
              className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
            >
              <span className="text-2xl w-8 text-center">{medals[i] ?? `#${i + 1}`}</span>
              <span className="text-2xl">{s.team.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{s.team.name}</p>
                <p className="text-xs text-gray-400">{s.correctCount} correct answers</p>
              </div>
              <span className={`font-bold text-xl ${s.team.textColor}`}>{s.score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition-colors active:scale-[0.98]"
        >
          New Contest
        </button>
      </div>
    </div>
  );
}

// ─── Contest Runner (isolated so hook remounts per session) ──────────────────

function ContestRunner({
  questions,
  teams,
  onRestart,
}: {
  questions: AnyQuestion[];
  teams: ContestTeam[];
  onRestart: () => void;
}) {
  const { state, isDone, finalScores, reveal, toggleTeam, confirmRound } = useContest(
    questions,
    teams,
  );

  if (isDone) {
    return <FinalScreen scores={finalScores} onRestart={onRestart} />;
  }

  if (!state) return null;

  if (state.phase === 'question') {
    return <QuestionScreen state={state} onReveal={reveal} />;
  }

  return <RevealScreen state={state} onToggle={toggleTeam} onConfirm={confirmRound} />;
}

// ─── Root export ──────────────────────────────────────────────────────────────

type Screen = 'pack-select' | 'team-setup' | 'contest';

export default function Contest() {
  const [screen, setScreen]   = useState<Screen>('pack-select');
  const [questions, setQ]     = useState<AnyQuestion[]>([]);
  const [teams, setTeams]     = useState<ContestTeam[]>(ALL_CONTEST_TEAMS.slice(0, 3));

  function toggleTeam(t: ContestTeam) {
    setTeams((prev) =>
      prev.some((s) => s.id === t.id)
        ? prev.filter((s) => s.id !== t.id)
        : [...prev, t],
    );
  }

  if (screen === 'pack-select') {
    return (
      <PackSelectScreen
        onSelect={(q) => {
          setQ(q);
          setScreen('team-setup');
        }}
      />
    );
  }

  if (screen === 'team-setup') {
    return (
      <TeamSetupScreen
        selected={teams}
        onToggle={toggleTeam}
        onStart={() => setScreen('contest')}
        onBack={() => setScreen('pack-select')}
      />
    );
  }

  return (
    <ContestRunner
      key={questions[0]?.id ?? 'contest'}
      questions={questions}
      teams={teams}
      onRestart={() => {
        setTeams(ALL_CONTEST_TEAMS.slice(0, 3));
        setScreen('pack-select');
      }}
    />
  );
}
