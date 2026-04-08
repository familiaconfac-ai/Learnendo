// ── Learnendo Battle — Host View (Teacher) ────────────────────────────────────
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { BattleSession } from './battleTypes';
import {
  startBattle, advanceBattleQuestion, showBattleAnswer, endBattle,
  autoRevealIfAllAnswered,
} from './battleService';
import { BattleResultsScreen } from './BattleResultsScreen';

interface Props {
  session: BattleSession;
  classId: string;
  teacherUid: string;
  onClose: () => void;   // called when teacher closes/ends battle
  onNewBattle: () => void;
}

export const BattleHostView: React.FC<Props> = ({
  session, classId, teacherUid, onClose, onNewBattle
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(session.config.timePerQuestion);
  const [busy, setBusy] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [musicMuted, setMusicMuted] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialise audio element once (points to public/sounds/battle_theme.mp3)
  useEffect(() => {
    const a = new Audio('/sounds/battle_theme.mp3');
    a.loop = true;
    a.volume = 0.4;
    audioRef.current = a;
    return () => { a.pause(); };
  }, []);

  // Play/pause based on status and mute toggle
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (session.status === 'active' && !musicMuted) {
      a.play().catch(() => {}); // fails silently if file missing
    } else {
      a.pause();
    }
  }, [session.status, musicMuted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicMuted ? 0 : 0.4;
  }, [musicMuted]);

  const questionIdx = session.currentQuestionIndex;
  const question = session.questions[questionIdx];
  const totalQ = session.questions.length;
  // Students only — the teacher/host is NOT a respondent and must not be counted
  const studentUids = useMemo(
    () => Object.keys(session.scores).filter(id => id !== teacherUid),
    [session.scores, teacherUid]
  );
  const answerCount = Object.keys(session.currentAnswers).length;
  const timeRatio = timeLeft / session.config.timePerQuestion;

  // ── Round summary (computed when showing-answer) ──────────────────────────
  const roundSummary = useMemo(() => {
    if (session.status !== 'showing-answer' || !question) return null;
    const answers = Object.values(session.currentAnswers);
    const correct = answers.filter(a => a.optionIndex === question.correctIndex).length;
    const wrong = answers.filter(a => a.optionIndex !== question.correctIndex).length;
    const unanswered = studentUids.length - answers.filter(a => studentUids.includes(a.uid)).length;
    return { correct, wrong, unanswered };
  }, [session.status, session.currentAnswers, question, studentUids]);

  // ── Auto-reveal: when all students have answered, call showBattleAnswer ───
  const autoRevealFiredRef = useRef<number>(-1); // tracks which questionIdx was auto-revealed
  useEffect(() => {
    if (session.status !== 'active') return;
    if (studentUids.length === 0) return;
    if (autoRevealFiredRef.current === questionIdx) return; // already fired this question

    const allAnswered = studentUids.every(id => id in session.currentAnswers);
    if (!allAnswered) return;

    autoRevealFiredRef.current = questionIdx;
    showBattleAnswer(classId).catch(err =>
      console.error('[Battle] auto-reveal failed:', err)
    );
  }, [session.status, session.currentAnswers, studentUids, questionIdx, classId]);

  // ── Timer expiry auto-reveal: if time runs out before all answer, reveal now ──
  useEffect(() => {
    if (session.status !== 'active') return;
    if (timeLeft > 0) return;
    if (autoRevealFiredRef.current === questionIdx) return; // already fired
    autoRevealFiredRef.current = questionIdx;
    showBattleAnswer(classId).catch(err =>
      console.error('[Battle] timer-expiry auto-reveal failed:', err)
    );
  }, [timeLeft, session.status, questionIdx, classId]);

  // Reset auto-reveal guard on question advance
  useEffect(() => {
    // When question changes, the guard resets automatically because questionIdx changed
  }, [questionIdx]);

  // Reset timer on question change
  useEffect(() => {
    setTimeLeft(session.config.timePerQuestion);
  }, [questionIdx, session.config.timePerQuestion]);

  // Countdown when active
  useEffect(() => {
    if (session.status !== 'active') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);

    const start = session.questionStartedAt;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, session.config.timePerQuestion - elapsed / 1000);
      setTimeLeft(remaining);
    }, 200);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.status, session.questionStartedAt, session.config.timePerQuestion]);

  useEffect(() => {
    if (session.status === 'finished') setShowResults(true);
  }, [session.status]);

  // Sorted leaderboard
  const leaderboard = useMemo(
    () => Object.values(session.scores).sort((a, b) => b.score - a.score).slice(0, 5),
    [session.scores]
  );

  async function handleStart() {
    setBusy(true);
    try { await startBattle(classId); } finally { setBusy(false); }
  }
  async function handleShowAnswer() {
    setBusy(true);
    try { await showBattleAnswer(classId); } finally { setBusy(false); }
  }
  async function handleNext() {
    setBusy(true);
    try { await advanceBattleQuestion(classId, questionIdx + 1, totalQ); } finally { setBusy(false); }
  }
  async function handleEnd() {
    setBusy(true);
    try { await endBattle(classId); } finally { setBusy(false); }
  }

  if (showResults) {
    return (
      <BattleResultsScreen
        scores={session.scores}
        myUid={teacherUid}
        onNewBattle={onNewBattle}
        onClose={onClose}
        isTeacher
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9000] flex bg-slate-950 select-none">
      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚔️</span>
            <span className="text-white font-bold text-sm">Learnendo Battle</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300">
              Q {questionIdx + 1} / {totalQ}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Music mute — plays public/sounds/battle_theme.mp3 when unmuted */}
            <button
              onClick={() => setMusicMuted(m => !m)}
              title={musicMuted ? 'Unmute battle music' : 'Mute battle music'}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs transition"
            >{musicMuted ? '🔇' : '🔉'}</button>
            <button
              onClick={handleEnd}
              className="text-xs text-slate-500 hover:text-red-400 transition"
            >
              End Game
            </button>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-1.5 bg-slate-800">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${timeRatio * 100}%`,
              backgroundColor: timeRatio > 0.5 ? '#22c55e' : timeRatio > 0.25 ? '#f97316' : '#ef4444',
            }}
          />
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          {session.status === 'lobby' ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">⚔️</div>
              <h2 className="text-2xl font-black text-white">Sala de Batalha Aberta!</h2>
              <p className="text-slate-400 text-sm">
                {studentUids.length > 0
                  ? `${studentUids.length} aluno${studentUids.length !== 1 ? 's' : ''} entrou na sala`
                  : 'Aguardando alunos entrarem…'}
              </p>
              <p className="text-slate-500 text-xs">
                {totalQ} perguntas · {session.config.timePerQuestion}s cada · {session.config.difficulty}
              </p>
              <p className="text-slate-600 text-xs">
                Os alunos entram automaticamente ao acessar a aula
              </p>
              <button
                onClick={handleStart}
                disabled={busy}
                className="mt-4 px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-lg hover:opacity-90 transition disabled:opacity-50"
              >
                🚀 Iniciar Batalha!
              </button>
            </div>
          ) : question ? (
            <>
              <div className="w-full max-w-lg bg-slate-800/80 rounded-2xl p-6 text-center shadow-lg">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Question {questionIdx + 1}</p>
                <div className="text-3xl font-bold text-white leading-snug">{question.text}</div>
              </div>

              <div className="w-full max-w-lg grid grid-cols-2 gap-3">
                {question.options.map((opt, i) => {
                  const isCorrect = i === question.correctIndex;
                  const showCorrect = session.status === 'showing-answer';
                  return (
                    <div
                      key={i}
                      className={`py-4 px-3 rounded-xl border-2 text-center text-sm font-bold transition-all ${
                        showCorrect && isCorrect
                          ? 'border-green-500 bg-green-500/20 text-green-300'
                          : showCorrect
                          ? 'border-slate-700 text-slate-500'
                          : 'border-slate-600 text-white'
                      }`}
                    >
                      {opt}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span>⏱ {Math.ceil(timeLeft)}s</span>
                <span>·</span>
                <span>{answerCount} / {studentUids.length} responderam</span>
              </div>

              {/* Round summary — shown when answer is revealed */}
              {session.status === 'showing-answer' && roundSummary && (
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/30">
                    <span className="text-green-400 text-lg">✅</span>
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-400">{roundSummary.correct}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">Correto</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30">
                    <span className="text-red-400 text-lg">❌</span>
                    <div className="text-center">
                      <div className="text-2xl font-black text-red-400">{roundSummary.wrong}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">Errado</div>
                    </div>
                  </div>
                  {roundSummary.unanswered > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/40 border border-slate-600/30">
                      <span className="text-slate-400 text-lg">⏰</span>
                      <div className="text-center">
                        <div className="text-2xl font-black text-slate-400">{roundSummary.unanswered}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">Sem resposta</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3 px-5 pb-5">
          {session.status === 'active' && (
            <button
              onClick={handleShowAnswer}
              disabled={busy}
              title="Revelar resposta agora (auto-revela quando todos responderem)"
              className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition disabled:opacity-50"
            >
              👁 Revelar Resposta
            </button>
          )}
          {session.status === 'showing-answer' && (
            <button
              onClick={handleNext}
              disabled={busy}
              className="px-10 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-base hover:opacity-90 transition disabled:opacity-50 shadow-lg shadow-orange-900/40 animate-pulse"
            >
              {questionIdx + 1 >= totalQ ? '🏆 Finalizar Batalha' : '▶ Próxima Pergunta'}
            </button>
          )}
        </div>
      </div>

      {/* Sidebar: leaderboard */}
      <div className="w-52 bg-slate-900 border-l border-slate-800 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Placar</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {leaderboard.map((p, i) => (
            <div key={p.uid} className="flex items-center gap-2 px-4 py-2">
              <span className="text-sm w-5 text-center text-slate-500">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="flex-1 text-xs text-white truncate">{p.name}</span>
              <span className="text-xs font-bold text-orange-400">{p.score.toLocaleString()}</span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-center text-slate-600 text-xs mt-6">Nenhum aluno ainda</p>
          )}
        </div>
      </div>
    </div>
  );
};
