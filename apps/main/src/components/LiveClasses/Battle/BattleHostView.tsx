import React, { useEffect, useMemo, useRef, useState } from 'react';
import { appLangToTts, speak } from '../../../services/ttsService';
import type { BattleSession } from './battleTypes';
import {
  advanceBattleQuestion,
  endBattle,
  showBattleAnswer,
  startBattle,
  submitBattleAnswer,
} from './battleService';
import { BattleResultsScreen } from './BattleResultsScreen';
import {
  getBattleCorrectAnswerLabel,
  getBattleCorrectIndexes,
  getBattleLanguage,
  getBattlePromptAudioText,
  getExpectedBattleParticipantIds,
  getMyBattleAnswer,
  isChoiceQuestion,
} from './battleUtils';

interface Props {
  session: BattleSession;
  classId: string;
  teacherUid: string;
  onClose: () => void;
  onNewBattle: () => void;
}

export const BattleHostView: React.FC<Props> = ({
  session,
  classId,
  teacherUid,
  onClose,
  onNewBattle,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(session.config.timePerQuestion);
  const [busy, setBusy] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [musicMuted, setMusicMuted] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const promptPlayedRef = useRef<string>('');

  const questionIdx = session.currentQuestionIndex;
  const question = session.questions[questionIdx];
  const totalQ = session.questions.length;
  const includeTeacher = !!session.config.includeTeacher;
  const battleLanguage = getBattleLanguage(session.config.courseId);
  const expectedParticipantIds = useMemo(
    () => getExpectedBattleParticipantIds(session, teacherUid),
    [session, teacherUid]
  );
  const teacherCanPlay = expectedParticipantIds.includes(teacherUid);
  const answerCount = Object.keys(session.currentAnswers).length;
  const timeRatio = timeLeft / session.config.timePerQuestion;
  const myAnswer = getMyBattleAnswer(session, teacherUid);
  const teacherHasAnswered = !!myAnswer || teacherSubmitting;
  const requiresChoiceConfirmation = question ? getBattleCorrectIndexes(question).length > 1 : false;
  const showTeacherInScores = includeTeacher || teacherCanPlay;
  const visibleScores = useMemo(
    () => showTeacherInScores
      ? session.scores
      : Object.fromEntries(Object.entries(session.scores).filter(([uid]) => uid !== teacherUid)),
    [session.scores, showTeacherInScores, teacherUid]
  );
  const leaderboard = useMemo(
    () => Object.values(visibleScores).sort((a, b) => b.score - a.score).slice(0, 5),
    [visibleScores]
  );

  useEffect(() => {
    const audio = new Audio('/sounds/battle_theme.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => { audio.pause(); };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (session.status === 'active' && !musicMuted) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [session.status, musicMuted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicMuted ? 0 : 0.4;
  }, [musicMuted]);

  useEffect(() => {
    setSelectedOptions([]);
    setTypedAnswer('');
    setTeacherSubmitting(false);
    setTimeLeft(session.config.timePerQuestion);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [questionIdx, session.config.timePerQuestion]);

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

  useEffect(() => {
    if (!question || session.status !== 'active' || !question.playAudioOnce) return;
    const promptKey = `${session.id}:${question.id}:${session.status}`;
    if (promptPlayedRef.current === promptKey) return;
    promptPlayedRef.current = promptKey;
    window.setTimeout(() => {
      speak(getBattlePromptAudioText(question), battleLanguage);
    }, 250);
  }, [session.id, session.status, question, battleLanguage]);

  useEffect(() => {
    if (session.status !== 'active') return;
    if (expectedParticipantIds.length === 0) return;

    const allAnswered = expectedParticipantIds.every((uid) => uid in session.currentAnswers);
    if (!allAnswered) return;

    showBattleAnswer(classId).catch((error) => {
      console.error('[Battle] auto-reveal failed:', error);
    });
  }, [session.status, expectedParticipantIds, session.currentAnswers, classId]);

  useEffect(() => {
    if (session.status !== 'active' || timeLeft > 0) return;
    showBattleAnswer(classId).catch((error) => {
      console.error('[Battle] timer auto-reveal failed:', error);
    });
  }, [session.status, timeLeft, classId]);

  function startSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Reconhecimento de voz não está disponível neste navegador.');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = appLangToTts(battleLanguage);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
      setTypedAnswer(transcript);
      setIsListening(false);
    };
    recognition.start();
  }

  function shouldRevealAfterTeacherAnswer() {
    return expectedParticipantIds.every((uid) => uid === teacherUid || uid in session.currentAnswers);
  }

  async function submitTeacherChoice(optionIndexes: number[]) {
    if (!teacherCanPlay || !question || !isChoiceQuestion(question) || teacherHasAnswered || session.status !== 'active' || optionIndexes.length === 0) return;
    setTeacherSubmitting(true);
    try {
      await submitBattleAnswer(classId, session, teacherUid, session.scores[teacherUid]?.name || 'Professor', {
        optionIndex: optionIndexes[0],
        optionIndexes,
      });
      setTimeLeft(0);
      if (shouldRevealAfterTeacherAnswer()) {
        if (timerRef.current) clearInterval(timerRef.current);
        await showBattleAnswer(classId);
      }
    } finally {
      setTeacherSubmitting(false);
    }
  }

  function toggleTeacherChoice(optionIndex: number) {
    if (!teacherCanPlay || !question || !isChoiceQuestion(question) || teacherHasAnswered || session.status !== 'active') return;
    if (!requiresChoiceConfirmation) {
      setSelectedOptions([optionIndex]);
      void submitTeacherChoice([optionIndex]);
      return;
    }
    setSelectedOptions((current) => (
      current.includes(optionIndex)
        ? current.filter((value) => value !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b)
    ));
  }

  async function confirmTeacherChoice() {
    if (!requiresChoiceConfirmation || selectedOptions.length === 0) return;
    await submitTeacherChoice(selectedOptions);
  }

  async function handleTeacherOpenAnswer() {
    if (!teacherCanPlay || !question || isChoiceQuestion(question) || teacherHasAnswered || session.status !== 'active' || !typedAnswer.trim()) return;
    setTeacherSubmitting(true);
    try {
      await submitBattleAnswer(
        classId,
        session,
        teacherUid,
        session.scores[teacherUid]?.name || 'Professor',
        { responseText: typedAnswer.trim() }
      );
      setTimeLeft(0);
      if (shouldRevealAfterTeacherAnswer()) {
        if (timerRef.current) clearInterval(timerRef.current);
        await showBattleAnswer(classId);
      }
    } finally {
      setTeacherSubmitting(false);
    }
  }

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
        scores={visibleScores}
        myUid={teacherUid}
        onNewBattle={onNewBattle}
        onClose={onClose}
        isTeacher
        hiddenUids={showTeacherInScores ? [] : [teacherUid]}
      />
    );
  }

  const answerLabel = question ? getBattleCorrectAnswerLabel(question) : '';
  const correctCount = Object.values(session.currentAnswers).filter((answer) => answer.isCorrect).length;
  const wrongCount = Object.values(session.currentAnswers).filter((answer) => !answer.isCorrect).length;
  const unansweredCount = Math.max(0, expectedParticipantIds.length - Object.keys(session.currentAnswers).length);

  return (
    <div className="fixed inset-0 z-[9000] flex bg-slate-950 select-none">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚔️</span>
            <span className="text-white font-bold text-sm">Learnendo Battle</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300">
              Q {questionIdx + 1} / {totalQ}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMusicMuted((value) => !value)}
              title={musicMuted ? 'Unmute battle music' : 'Mute battle music'}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs transition"
            >
              {musicMuted ? '🔇' : '🔉'}
            </button>
            <button
              onClick={handleEnd}
              className="text-xs text-slate-500 hover:text-red-400 transition"
            >
              End Game
            </button>
          </div>
        </div>

        <div className="h-1.5 bg-slate-800">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${timeRatio * 100}%`,
              backgroundColor: timeRatio > 0.5 ? '#22c55e' : timeRatio > 0.25 ? '#f97316' : '#ef4444',
            }}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          {session.status === 'lobby' ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">⚔️</div>
              <h2 className="text-2xl font-black text-white">Sala de Batalha Aberta!</h2>
              <p className="text-slate-400 text-sm">
                {expectedParticipantIds.length > 0
                  ? `${expectedParticipantIds.length} participante${expectedParticipantIds.length !== 1 ? 's' : ''} pronto${expectedParticipantIds.length !== 1 ? 's' : ''}`
                  : 'Aguardando alunos entrarem...'}
              </p>
              <p className="text-slate-500 text-xs">
                {totalQ} perguntas · {session.config.timePerQuestion}s cada · {session.config.difficulty}
              </p>
              <p className="text-slate-600 text-xs">
                {includeTeacher
                  ? 'Professor participa do placar nesta batalha.'
                  : teacherCanPlay
                    ? 'Modo solo do professor ativo para teste.'
                    : 'Professor só comanda a partida nesta batalha.'}
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
              <div className="w-full max-w-2xl bg-slate-800/80 rounded-2xl p-6 text-center shadow-lg space-y-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Question {questionIdx + 1}</p>
                <div className="text-3xl font-bold text-white leading-snug">{question.text}</div>
                {question.imageUrl && (
                  <img
                    src={question.imageUrl}
                    alt="Question reference"
                    className="mx-auto max-h-52 w-auto rounded-xl border border-slate-700 object-contain bg-slate-900"
                  />
                )}
                {question.kind === 'audio-choice' && (
                  <p className="text-xs text-amber-300">Audio toca uma vez so e a turma escolhe entre as alternativas.</p>
                )}
                {question.kind === 'audio-open' && (
                  <p className="text-xs text-amber-300">Áudio toca uma vez só para a turma.</p>
                )}
                {question.kind === 'speaking' && (
                  <p className="text-xs text-amber-300">Speaking com frase completa. A turma responde falando.</p>
                )}
              </div>

              {isChoiceQuestion(question) ? (
                <>
                  <div className="w-full max-w-lg grid grid-cols-2 gap-3">
                    {(question.options ?? []).map((opt, index) => {
                      const showCorrect = session.status === 'showing-answer';
                      const isCorrect = (question.correctIndexes ?? [question.correctIndex ?? 0]).includes(index);
                      const isTeacherSelection = selectedOptions.includes(index);
                      return (
                        <button
                          key={index}
                          onClick={() => toggleTeacherChoice(index)}
                          disabled={session.status !== 'active' || (!teacherCanPlay ? true : teacherHasAnswered)}
                          className={`py-4 px-3 rounded-xl border-2 text-center text-sm font-bold transition-all ${
                            showCorrect && isCorrect
                              ? 'border-green-500 bg-green-500/20 text-green-300'
                              : isTeacherSelection
                              ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                              : showCorrect
                              ? 'border-slate-700 text-slate-500'
                              : 'border-slate-600 text-white'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {teacherCanPlay && requiresChoiceConfirmation && (
                    <button
                      onClick={confirmTeacherChoice}
                      disabled={teacherHasAnswered || selectedOptions.length === 0 || session.status !== 'active'}
                      className="w-full max-w-lg rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      Confirmar resposta do professor
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full max-w-lg space-y-3">
                  <textarea
                    value={typedAnswer}
                    onChange={(event) => setTypedAnswer(event.target.value)}
                    disabled={!teacherCanPlay || teacherHasAnswered || session.status !== 'active'}
                    placeholder={question.kind === 'speaking' ? 'Resposta do professor...' : 'Digite a resposta do professor...'}
                    className="w-full min-h-28 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-400 disabled:opacity-60"
                  />
                  {teacherCanPlay && (
                    <div className="flex gap-3">
                      {question.kind === 'speaking' && (
                        <button
                          onClick={startSpeechRecognition}
                          disabled={teacherHasAnswered || isListening || session.status !== 'active'}
                          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                        >
                          {isListening ? 'Ouvindo...' : '🎤 Professor responde'}
                        </button>
                      )}
                      <button
                        onClick={handleTeacherOpenAnswer}
                        disabled={!typedAnswer.trim() || teacherHasAnswered || session.status !== 'active'}
                        className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                      >
                        Confirmar resposta do professor
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span>⏱ {Math.ceil(timeLeft)}s</span>
                <span>·</span>
                <span>{answerCount} / {expectedParticipantIds.length} responderam</span>
              </div>

              {session.status === 'showing-answer' && (
                <>
                  <p className="text-sm text-green-300">
                    Resposta correta: <span className="font-bold">{answerLabel || '—'}</span>
                  </p>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/30">
                      <span className="text-green-400 text-lg">✅</span>
                      <div className="text-center">
                        <div className="text-2xl font-black text-green-400">{correctCount}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">Correto</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30">
                      <span className="text-red-400 text-lg">❌</span>
                      <div className="text-center">
                        <div className="text-2xl font-black text-red-400">{wrongCount}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">Errado</div>
                      </div>
                    </div>
                    {unansweredCount > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/40 border border-slate-600/30">
                        <span className="text-slate-400 text-lg">⏰</span>
                        <div className="text-center">
                          <div className="text-2xl font-black text-slate-400">{unansweredCount}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide">Sem resposta</div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>

        <div className="flex justify-center gap-3 px-5 pb-5">
          {session.status === 'active' && (
            <button
              onClick={handleShowAnswer}
              disabled={busy}
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

        {/* Compact leaderboard strip — mobile only (md+ uses the side panel) */}
        {leaderboard.length > 0 && (
          <div className="md:hidden flex overflow-x-auto items-center gap-2 px-4 pb-2 border-t border-slate-800 pt-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider flex-shrink-0">Placar</span>
            {leaderboard.slice(0, 3).map((player, index) => (
              <div key={player.uid} className="flex items-center gap-1 bg-slate-800 rounded-full px-2 py-0.5 flex-shrink-0">
                <span className="text-xs">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                <span className="text-[11px] text-white truncate max-w-[64px]">{player.name}</span>
                <span className="text-[11px] font-bold text-orange-400 ml-1">{player.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

      </div>

      <div className="hidden md:flex md:flex-col w-52 bg-slate-900 border-l border-slate-800">
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Placar</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {leaderboard.map((player, index) => (
            <div key={player.uid} className="flex items-center gap-2 px-4 py-2">
              <span className="text-sm w-5 text-center text-slate-500">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </span>
              <span className="flex-1 text-xs text-white truncate">{player.name}</span>
              <span className="text-xs font-bold text-orange-400">{player.score.toLocaleString()}</span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-center text-slate-600 text-xs mt-6">Nenhum participante ainda</p>
          )}
        </div>
      </div>
    </div>
  );
};
