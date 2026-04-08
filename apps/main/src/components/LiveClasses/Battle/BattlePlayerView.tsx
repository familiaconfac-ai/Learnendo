// ── Learnendo Battle — Player View (Student) ─────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import type { BattleSession } from './battleTypes';
import { submitBattleAnswer, joinBattle } from './battleService';
import { BattleResultsScreen } from './BattleResultsScreen';

// ── Audio infrastructure ──────────────────────────────────────────────────────
// Battle music is loaded from public/sounds/battle_theme.mp3.
// If the file does not exist yet, play() fails silently.
//
// TO SWAP THE TRACK:
//   1. Place your MP3 at:  apps/main/public/sounds/battle_theme.mp3
//   2. Adjust `audio.volume` below if needed.
//   3. Done — no code changes required.
//
// TO DISABLE PERMANENTLY:
//   Delete the `musicRef.current?.start()` call in the useEffect that
//   watches `session.status === 'active'`.

interface TensionLoop {
  start(): void;
  stop(): void;
  setVolume(v: number): void;
}

function createBattleAudio(): TensionLoop | null {
  try {
    const audio = new Audio('/sounds/battle_theme.mp3');
    audio.loop = true;
    audio.volume = 0.5;
    return {
      start()  { audio.play().catch(() => {}); },
      stop()   { audio.pause(); audio.currentTime = 0; },
      setVolume(v: number) { audio.volume = Math.max(0, Math.min(1, v)); },
    };
  } catch {
    return null;
  }
}

interface Props {
  session: BattleSession;
  classId: string;
  uid: string;
  name: string;
}

export const BattlePlayerView: React.FC<Props> = ({ session, classId, uid, name }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(session.config.timePerQuestion);
  const [showResults, setShowResults] = useState(false);
  const [musicMuted, setMusicMuted] = useState(true); // off by default; user can enable with 🔉
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasJoinedRef = useRef(false);
  const musicRef = useRef<TensionLoop | null>(null);

  // ── Audio lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    musicRef.current = createBattleAudio();
    return () => { musicRef.current?.stop(); };
  }, []);

  useEffect(() => {
    if (session.status === 'active') {
      if (!musicMuted) musicRef.current?.start();
    } else {
      musicRef.current?.stop();
    }
  }, [session.status, musicMuted]);

  useEffect(() => {
    musicRef.current?.setVolume(musicMuted ? 0 : 1);
  }, [musicMuted]);

  // Join battle once
  useEffect(() => {
    if (!hasJoinedRef.current && !session.scores[uid]) {
      hasJoinedRef.current = true;
      joinBattle(classId, uid, name).catch(console.warn);
    }
  }, [classId, uid, name, session.scores]);

  // Reset per question
  const questionIdx = session.currentQuestionIndex;
  useEffect(() => {
    setSelectedOption(null);
    setSubmitted(false);
    setTimeLeft(session.config.timePerQuestion);
  }, [questionIdx, session.config.timePerQuestion]);

  // Countdown timer
  useEffect(() => {
    if (session.status !== 'active') return;
    if (timerRef.current) clearInterval(timerRef.current);

    const start = session.questionStartedAt;
    const limit = session.config.timePerQuestion * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, session.config.timePerQuestion - elapsed / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
    }, 200);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.status, session.questionStartedAt, session.config.timePerQuestion]);

  // Handle finished
  useEffect(() => {
    if (session.status === 'finished') {
      setShowResults(true);
    }
  }, [session.status]);

  if (showResults) {
    return (
      <BattleResultsScreen
        scores={session.scores}
        myUid={uid}
        onClose={() => setShowResults(false)}
        isTeacher={false}
      />
    );
  }

  const myScore = session.scores[uid]?.score ?? 0;
  const myStreak = session.scores[uid]?.streak ?? 0;
  const question = session.questions[questionIdx];
  const totalQ = session.questions.length;
  const timeRatio = timeLeft / session.config.timePerQuestion;
  const hasAnswered = submitted || uid in session.currentAnswers;

  // Lobby screen
  if (session.status === 'lobby') {
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/85 backdrop-blur-sm">
        <div className="text-center space-y-4 px-8">
          <div className="text-5xl animate-bounce">⚔️</div>
          <h2 className="text-2xl font-bold text-white">Battle Starting!</h2>
          <p className="text-slate-300">Waiting for the teacher to start…</p>
          <div className="mt-4 bg-slate-800/60 rounded-xl px-6 py-3 inline-block">
            <p className="text-xs text-slate-400">Your score</p>
            <p className="text-3xl font-black text-orange-400">{myScore.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  if (session.status === 'showing-answer' || !question) {
    const myAnswer = session.currentAnswers[uid];
    const correct = question?.correctIndex;
    const myWasCorrect = myAnswer ? myAnswer.optionIndex === question?.correctIndex : null;

    // Round summary
    const allAnswers = Object.values(session.currentAnswers);
    const correctCount = allAnswers.filter(a => a.optionIndex === question?.correctIndex).length;
    const wrongCount = allAnswers.filter(a => a.optionIndex !== question?.correctIndex).length;

    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/85 backdrop-blur-sm">
        <div className="w-full max-w-xs mx-4 text-center space-y-4">
          <div className="text-5xl">{myWasCorrect === true ? '✅' : myWasCorrect === false ? '❌' : '⏰'}</div>
          <h2 className="text-xl font-bold text-white">
            {myWasCorrect === true ? 'Correct!' : myWasCorrect === false ? 'Wrong!' : 'Time up!'}
          </h2>
          {question && (
            <p className="text-sm text-slate-300">
              Answer: <span className="text-green-400 font-bold">{question.options[correct ?? 0]}</span>
            </p>
          )}
          <div className="bg-slate-800/60 rounded-xl px-6 py-3 inline-block">
            <p className="text-xs text-slate-400">Total score</p>
            <p className="text-3xl font-black text-orange-400">{myScore.toLocaleString()}</p>
            {myStreak >= 3 && <p className="text-xs text-orange-300">🔥 {myStreak} streak!</p>}
          </div>
          {/* Round summary */}
          <div className="flex justify-center gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold">
              ✅ {correctCount} correct
            </span>
            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 font-semibold">
              ❌ {wrongCount} wrong
            </span>
          </div>
          <p className="text-xs text-slate-500">Waiting for next question…</p>
        </div>
      </div>
    );
  }

  async function handleSelect(idx: number) {
    if (hasAnswered || session.status !== 'active') return;
    setSelectedOption(idx);
    setSubmitted(true);
    try {
      await submitBattleAnswer(classId, session, uid, name, idx);
    } catch (e) {
      console.error('[Battle] submit answer failed', e);
    }
  }

  return (
    <div className="fixed inset-0 z-[9000] flex flex-col bg-slate-950 select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div className="text-xs text-slate-400">
          Q {questionIdx + 1} <span className="text-slate-600">/ {totalQ}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 rounded-full px-3 py-1">
            <span className="text-orange-400 font-bold text-sm">{myScore.toLocaleString()}</span>
            <span className="text-slate-500 text-xs">pts</span>
            {myStreak >= 3 && <span className="ml-1 text-xs">🔥{myStreak}</span>}
          </div>
          {/* Music mute toggle */}
          <button
            onClick={() => setMusicMuted(m => !m)}
            title={musicMuted ? 'Unmute music' : 'Mute music'}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs transition"
          >
            {musicMuted ? '🔇' : '🔉'}
          </button>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-slate-800">
        <div
          className="h-full transition-all bg-gradient-to-r from-green-500 to-orange-500"
          style={{
            width: `${timeRatio * 100}%`,
            backgroundColor: timeRatio > 0.5 ? undefined : timeRatio > 0.25 ? '#f97316' : '#ef4444'
          }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        <div className="w-full max-w-sm bg-slate-800/80 rounded-2xl p-6 text-center shadow-inner">
          <div className="text-3xl font-bold text-white leading-snug">{question.text}</div>
          {question.hint && (
            <p className="text-xs text-slate-400 mt-2">{question.hint}</p>
          )}
        </div>

        <div className="w-full max-w-sm grid grid-cols-2 gap-3">
          {question.options.map((opt, i) => {
            const isSelected = selectedOption === i;
            const isCorrect = session.status === 'showing-answer' && i === question.correctIndex;
            const isWrong = session.status === 'showing-answer' && isSelected && !isCorrect;
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={hasAnswered}
                className={`py-4 px-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${
                  isCorrect
                    ? 'border-green-500 bg-green-500/20 text-green-300'
                    : isWrong
                    ? 'border-red-500 bg-red-500/20 text-red-300'
                    : isSelected
                    ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                    : hasAnswered
                    ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                    : 'border-slate-600 text-white hover:border-orange-400 hover:bg-orange-400/10'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {hasAnswered && session.status === 'active' && (
          <p className="text-sm text-slate-400 animate-pulse">Answer locked in! ✓</p>
        )}
        {timeLeft <= 0 && !hasAnswered && (
          <p className="text-sm text-red-400">Time's up!</p>
        )}
      </div>

      {/* Bottom: rank preview */}
      <div className="px-4 pb-4">
        <div className="flex justify-center gap-4 text-xs text-slate-500">
          <span>⏱ {Math.ceil(timeLeft)}s</span>
          <span>·</span>
          <span>{Object.keys(session.currentAnswers).length} answered</span>
        </div>
      </div>
    </div>
  );
};
