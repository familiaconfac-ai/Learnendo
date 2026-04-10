import React, { useEffect, useMemo, useRef, useState } from 'react';
import { appLangToTts, speak } from '../../../services/ttsService';
import type { BattleAnswer, BattleSession } from './battleTypes';
import { joinBattle, submitBattleAnswer } from './battleService';
import { BattleResultsScreen } from './BattleResultsScreen';
import {
  evaluateBattleAnswer,
  getBattleCorrectAnswerLabel,
  getBattleCorrectIndexes,
  getBattleLanguage,
  getBattlePromptAudioText,
  getMyBattleAnswer,
  isChoiceQuestion,
} from './battleUtils';

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
      start() { audio.play().catch(() => {}); },
      stop() { audio.pause(); audio.currentTime = 0; },
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
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // Local answer registered immediately on submit — same pattern as BattleHostView.
  // Ensures reveal shows correct/incorrect and roundPoints without waiting for Firestore.
  const [localMyAnswer, setLocalMyAnswer] = useState<BattleAnswer | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(session.config.timePerQuestion);
  const [showResults, setShowResults] = useState(false);
  const [musicMuted, setMusicMuted] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasJoinedRef = useRef(false);
  const musicRef = useRef<TensionLoop | null>(null);
  const recognitionRef = useRef<any>(null);
  const promptPlayedRef = useRef<string>('');

  const questionIdx = session.currentQuestionIndex;
  const question = session.questions[questionIdx];
  const totalQ = session.questions.length;
  const myScore = session.scores[uid]?.score ?? 0;
  // Show optimistic total including this round's points before Firestore score update arrives
  const myTotalScore = myScore + (localMyAnswer?.roundPoints ?? 0);
  const myStreak = session.scores[uid]?.streak ?? 0;
  // Use localMyAnswer as fallback so reveal shows correct/incorrect immediately
  // before Firestore echoes back the written answer.
  const myAnswer = localMyAnswer ?? getMyBattleAnswer(session, uid);
  const hasAnswered = submitted || !!myAnswer;
  const battleLanguage = getBattleLanguage(session.config.courseId);
  const timeRatio = timeLeft / session.config.timePerQuestion;
  const isOpenQuestion = question ? !isChoiceQuestion(question) : false;
  const showMicButton = question?.kind === 'speaking';
  const requiresChoiceConfirmation = question ? getBattleCorrectIndexes(question).length > 1 : false;

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

  useEffect(() => {
    if (!hasJoinedRef.current && !session.scores[uid]) {
      hasJoinedRef.current = true;
      joinBattle(classId, uid, name).catch(console.warn);
    }
  }, [classId, uid, name, session.scores]);

  useEffect(() => {
    setSelectedOptions([]);
    setTypedAnswer('');
    setSubmitted(false);
    setLocalMyAnswer(null); // clear local answer when question changes
    setTimeLeft(session.config.timePerQuestion);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [questionIdx, session.config.timePerQuestion]);

  useEffect(() => {
    if (session.status !== 'active') return;
    if (timerRef.current) clearInterval(timerRef.current);

    const start = session.questionStartedAt;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, session.config.timePerQuestion - elapsed / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
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

  async function submitChoiceAnswer(optionIndexes: number[]) {
    if (!question || !isChoiceQuestion(question) || hasAnswered || session.status !== 'active' || optionIndexes.length === 0) return;
    
    const answeredAt = Date.now();
    const payload = { optionIndex: optionIndexes[0], optionIndexes };
    
    // Register locally before any await so reveal renders correct state immediately
    const isCorrect = evaluateBattleAnswer(question, payload);
    const elapsedMs = session.questionStartedAt > 0 ? answeredAt - session.questionStartedAt : 0;
    const speedRatio = session.questionStartedAt > 0
      ? Math.max(0, 1 - (elapsedMs / 1000) / session.config.timePerQuestion)
      : 0;
    const prevParticipant = session.scores[uid] ?? { score: 0, streak: 0 };
    const newStreak = isCorrect ? prevParticipant.streak + 1 : 0;
    const roundPoints = isCorrect
      ? 500 + Math.round(speedRatio * 500) + Math.min(200, newStreak * 50)
      : 0;
    setLocalMyAnswer({ uid, name, optionIndex: payload.optionIndex, optionIndexes: payload.optionIndexes, isCorrect, answeredAt, elapsedMs, roundPoints });
    setSubmitted(true);
    
    try {
      await submitBattleAnswer(classId, session, uid, name, payload);
    } catch (error) {
      console.error('[Battle] submit answer failed', error);
      setSubmitted(false);
      setLocalMyAnswer(null);
    }
  }

  function toggleChoiceSelection(optionIndex: number) {
    if (!question || !isChoiceQuestion(question) || hasAnswered || session.status !== 'active') return;
    if (!requiresChoiceConfirmation) {
      setSelectedOptions([optionIndex]);
      void submitChoiceAnswer([optionIndex]);
      return;
    }
    setSelectedOptions((current) => (
      current.includes(optionIndex)
        ? current.filter((value) => value !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b)
    ));
  }

  async function confirmChoiceAnswer() {
    if (!requiresChoiceConfirmation || selectedOptions.length === 0) return;
    await submitChoiceAnswer(selectedOptions);
  }

  async function submitOpenAnswer() {
    if (!question || !isOpenQuestion || hasAnswered || session.status !== 'active' || !typedAnswer.trim()) return;
    
    const answeredAt = Date.now();
    const payload = { responseText: typedAnswer.trim() };
    
    const isCorrect = evaluateBattleAnswer(question, payload);
    const elapsedMs = session.questionStartedAt > 0 ? answeredAt - session.questionStartedAt : 0;
    const speedRatio = session.questionStartedAt > 0
      ? Math.max(0, 1 - (elapsedMs / 1000) / session.config.timePerQuestion)
      : 0;
    const prevParticipant = session.scores[uid] ?? { score: 0, streak: 0 };
    const newStreak = isCorrect ? prevParticipant.streak + 1 : 0;
    const roundPoints = isCorrect
      ? 500 + Math.round(speedRatio * 500) + Math.min(200, newStreak * 50)
      : 0;
    setLocalMyAnswer({ uid, name, responseText: payload.responseText, isCorrect, answeredAt, elapsedMs, roundPoints });
    setSubmitted(true);
    
    try {
      await submitBattleAnswer(classId, session, uid, name, payload);
    } catch (error) {
      console.error('[Battle] submit answer failed', error);
      setSubmitted(false);
      setLocalMyAnswer(null);
    }
  }

  const answerLabel = question ? getBattleCorrectAnswerLabel(question) : '';
  const correctCount = useMemo(
    () => Object.values(session.currentAnswers).filter(answer => answer.isCorrect).length,
    [session.currentAnswers]
  );
  const wrongCount = useMemo(
    () => Object.values(session.currentAnswers).filter(answer => !answer.isCorrect).length,
    [session.currentAnswers]
  );

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

  if (session.status === 'lobby') {
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/85 backdrop-blur-sm">
        <div className="text-center space-y-4 px-8">
          <div className="text-5xl animate-bounce">⚔️</div>
          <h2 className="text-2xl font-bold text-white">Battle Starting!</h2>
          <p className="text-slate-300">Waiting for the teacher to start...</p>
          <div className="mt-4 bg-slate-800/60 rounded-xl px-6 py-3 inline-block">
            <p className="text-xs text-slate-400">Your score</p>
            <p className="text-3xl font-black text-orange-400">{myScore.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  if (session.status === 'showing-answer' || !question) {
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/85 backdrop-blur-sm">
        <div className="w-full max-w-sm mx-4 text-center space-y-4">
          <div className="text-5xl">
            {myAnswer?.isCorrect === true ? '✅' : myAnswer?.isCorrect === false ? '❌' : '⏰'}
          </div>
          <h2 className="text-xl font-bold text-white">
            {myAnswer?.isCorrect === true ? 'Correct!' : myAnswer?.isCorrect === false ? 'Wrong!' : 'Time up!'}
          </h2>
          {question && (
            <p className="text-sm text-slate-300">
              Answer: <span className="text-green-400 font-bold">{answerLabel || '—'}</span>
            </p>
          )}
          <div className="bg-slate-800/60 rounded-xl px-6 py-3 inline-block">
            <p className="text-xs text-slate-400">Total score</p>
            <p className="text-3xl font-black text-orange-400">{myTotalScore.toLocaleString()}</p>
            {localMyAnswer && localMyAnswer.roundPoints > 0 && (
              <p className="text-xs text-green-400">+{localMyAnswer.roundPoints} nesta rodada</p>
            )}
            {myStreak >= 3 && <p className="text-xs text-orange-300">🔥 {myStreak} streak!</p>}
          </div>
          <div className="flex justify-center gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold">
              ✅ {correctCount} correct
            </span>
            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 font-semibold">
              ❌ {wrongCount} wrong
            </span>
          </div>
          <p className="text-xs text-slate-500">Waiting for next question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9000] flex flex-col bg-slate-950 select-none">
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
          <button
            onClick={() => setMusicMuted((value) => !value)}
            title={musicMuted ? 'Unmute music' : 'Mute music'}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs transition"
          >
            {musicMuted ? '🔇' : '🔉'}
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-slate-800">
        <div
          className="h-full transition-all bg-gradient-to-r from-green-500 to-orange-500"
          style={{
            width: `${timeRatio * 100}%`,
            backgroundColor: timeRatio > 0.5 ? undefined : timeRatio > 0.25 ? '#f97316' : '#ef4444',
          }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        <div className="w-full max-w-md bg-slate-800/80 rounded-2xl p-6 text-center shadow-inner space-y-4">
          <div className="text-3xl font-bold text-white leading-snug">{question.text}</div>
          {question.imageUrl && (
            <img
              src={question.imageUrl}
              alt="Question reference"
              className="mx-auto max-h-48 w-auto rounded-xl border border-slate-700 object-contain bg-slate-900"
            />
          )}
          {question.kind === 'audio-choice' && (
            <p className="text-xs text-amber-300">
              Escute apenas uma vez e escolha a resposta entre as alternativas.
            </p>
          )}
          {question.kind === 'audio-open' && (
            <p className="text-xs text-amber-300">
              Escute apenas uma vez e digite a resposta.
            </p>
          )}
          {question.kind === 'speaking' && (
            <p className="text-xs text-amber-300">
              Ouça o comando e responda falando uma frase completa.
            </p>
          )}
          {question.hint && <p className="text-xs text-slate-400">{question.hint}</p>}
        </div>

        {isChoiceQuestion(question) ? (
          <>
            <div className="w-full max-w-sm grid grid-cols-2 gap-3">
              {(question.options ?? []).map((opt, index) => {
                const isSelected = selectedOptions.includes(index);
                return (
                  <button
                    key={index}
                    onClick={() => toggleChoiceSelection(index)}
                    disabled={hasAnswered}
                    className={`py-4 px-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${
                      isSelected
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
            {requiresChoiceConfirmation && (
              <button
                onClick={confirmChoiceAnswer}
                disabled={hasAnswered || selectedOptions.length === 0}
                className="w-full max-w-sm rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Confirmar resposta
              </button>
            )}
          </>
        ) : (
          <div className="w-full max-w-sm space-y-3">
            <textarea
              value={typedAnswer}
              onChange={(event) => setTypedAnswer(event.target.value)}
              disabled={hasAnswered}
              placeholder={question.kind === 'speaking' ? 'Sua resposta falada aparece aqui...' : 'Digite sua resposta...'}
              className="w-full min-h-28 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-400 disabled:opacity-60"
            />
            <div className="flex gap-3">
              {showMicButton && (
                <button
                  onClick={startSpeechRecognition}
                  disabled={hasAnswered || isListening}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {isListening ? 'Ouvindo...' : '🎤 Responder falando'}
                </button>
              )}
              <button
                onClick={submitOpenAnswer}
                disabled={hasAnswered || !typedAnswer.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Confirmar resposta
              </button>
            </div>
          </div>
        )}

        {hasAnswered && session.status === 'active' && (
          <p className="text-sm text-slate-400 animate-pulse">Answer locked in!</p>
        )}
        {timeLeft <= 0 && !hasAnswered && (
          <p className="text-sm text-red-400">Time&apos;s up!</p>
        )}
      </div>

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
