import React, { useEffect, useMemo, useRef, useState } from 'react';
import { appLangToTts, speak } from '../../../services/ttsService';
import type { SavedBattleTemplate } from './battleTypes';
import { BattleResultsScreen } from './BattleResultsScreen';
import {
  evaluateBattleAnswer,
  getBattleCorrectAnswerLabel,
  getBattleLanguage,
  getBattlePromptAudioText,
  isChoiceQuestion,
} from './battleUtils';

interface Props {
  template: SavedBattleTemplate;
  uid: string;
  name: string;
  isTeacher?: boolean;
  onClose: () => void;
}

export const BattlePracticeView: React.FC<Props> = ({
  template,
  uid,
  name,
  isTeacher = false,
  onClose,
}) => {
  const [status, setStatus] = useState<'lobby' | 'active' | 'showing-answer' | 'finished'>('lobby');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(template.config.timePerQuestion);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [musicMuted, setMusicMuted] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<number>(0);
  const promptPlayedRef = useRef('');
  const recognitionRef = useRef<any>(null);

  const question = template.questions[questionIndex];
  const totalQuestions = template.questions.length;
  const battleLanguage = getBattleLanguage(template.config.courseId);
  const answerLabel = question ? getBattleCorrectAnswerLabel(question) : '';
  const scores = useMemo(() => ({
    [uid]: {
      uid,
      name,
      score,
      streak,
      lastAnswerCorrect,
    },
  }), [uid, name, score, streak, lastAnswerCorrect]);

  useEffect(() => {
    const audio = new Audio('/sounds/battle_theme.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => {
      audio.pause();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (status === 'active' && !musicMuted) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [status, musicMuted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicMuted ? 0 : 0.4;
  }, [musicMuted]);

  useEffect(() => {
    setSelectedOption(null);
    setTypedAnswer('');
    setTimeLeft(template.config.timePerQuestion);
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  }, [questionIndex, template.config.timePerQuestion]);

  useEffect(() => {
    if (status !== 'active') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    startedAtRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, template.config.timePerQuestion - elapsed / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setLastAnswerCorrect(false);
        setStreak(0);
        setStatus('showing-answer');
      }
    }, 200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, template.config.timePerQuestion]);

  useEffect(() => {
    if (!question || status !== 'active' || !question.playAudioOnce) return;
    const promptKey = `${template.id}:${question.id}:${status}`;
    if (promptPlayedRef.current === promptKey) return;
    promptPlayedRef.current = promptKey;
    window.setTimeout(() => {
      speak(getBattlePromptAudioText(question), battleLanguage);
    }, 250);
  }, [template.id, question, status, battleLanguage]);

  function startSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Reconhecimento de voz nao esta disponivel neste navegador.');
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

  function lockAnswer(payload: { optionIndex?: number; responseText?: string }) {
    if (!question || status !== 'active') return;

    const isCorrect = evaluateBattleAnswer(question, payload);
    const elapsed = (Date.now() - startedAtRef.current) / 1000;
    const speedRatio = Math.max(0, 1 - elapsed / template.config.timePerQuestion);
    const nextStreak = isCorrect ? streak + 1 : 0;
    const gainedScore = isCorrect
      ? 500 + Math.round(speedRatio * 500) + Math.min(200, nextStreak * 50)
      : 0;

    if (payload.optionIndex != null) setSelectedOption(payload.optionIndex);
    if (payload.responseText) setTypedAnswer(payload.responseText);
    setScore((value) => value + gainedScore);
    setStreak(nextStreak);
    setLastAnswerCorrect(isCorrect);
    setStatus('showing-answer');
  }

  function handleNext() {
    if (questionIndex + 1 >= totalQuestions) {
      setStatus('finished');
      return;
    }

    setQuestionIndex((value) => value + 1);
    setStatus('active');
  }

  if (status === 'finished') {
    return (
      <BattleResultsScreen
        scores={scores}
        myUid={uid}
        onClose={onClose}
        isTeacher={isTeacher}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9200] flex flex-col bg-slate-950 select-none">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div>
          <div className="text-sm font-black text-white">{template.title}</div>
          <div className="text-xs text-slate-400">Modo solo • {name}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMusicMuted((value) => !value)}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs transition"
            title={musicMuted ? 'Ativar musica' : 'Silenciar musica'}
          >
            {musicMuted ? '🔇' : '🔉'}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200"
          >
            Fechar
          </button>
        </div>
      </div>

      {status === 'lobby' ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center space-y-4">
            <div className="text-5xl">⚔️</div>
            <h2 className="text-2xl font-black text-white">Learnendo Battle Solo</h2>
            <p className="text-sm text-slate-300">
              {template.questions.length} perguntas • {template.config.timePerQuestion}s por pergunta
            </p>
            <button
              onClick={() => setStatus('active')}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 px-5 py-4 text-base font-black text-white"
            >
              Começar treino
            </button>
          </div>
        </div>
      ) : question ? (
        <>
          <div className="h-1.5 bg-slate-800">
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${(timeLeft / template.config.timePerQuestion) * 100}%`,
                backgroundColor: timeLeft > template.config.timePerQuestion * 0.5 ? '#22c55e' : timeLeft > template.config.timePerQuestion * 0.25 ? '#f97316' : '#ef4444',
              }}
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
            <div className="w-full max-w-md rounded-2xl bg-slate-800/80 p-6 text-center space-y-4">
              <div className="text-xs uppercase tracking-wider text-slate-500">Pergunta {questionIndex + 1} / {totalQuestions}</div>
              <div className="text-3xl font-bold text-white leading-snug">{question.text}</div>
              {question.imageUrl && (
                <img
                  src={question.imageUrl}
                  alt="Question reference"
                  className="mx-auto max-h-48 w-auto rounded-xl border border-slate-700 object-contain bg-slate-900"
                />
              )}
              {question.kind === 'audio-open' && <p className="text-xs text-amber-300">Escute uma vez e responda.</p>}
              {question.kind === 'speaking' && <p className="text-xs text-amber-300">Responda falando uma frase completa.</p>}
            </div>

            {status === 'active' && isChoiceQuestion(question) ? (
              <div className="w-full max-w-sm grid grid-cols-2 gap-3">
                {(question.options ?? []).map((option, index) => (
                  <button
                    key={index}
                    onClick={() => lockAnswer({ optionIndex: index })}
                    className={`py-4 px-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${
                      selectedOption === index
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-slate-600 text-white hover:border-orange-400 hover:bg-orange-400/10'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : status === 'active' ? (
              <div className="w-full max-w-sm space-y-3">
                <textarea
                  value={typedAnswer}
                  onChange={(event) => setTypedAnswer(event.target.value)}
                  placeholder={question.kind === 'speaking' ? 'Sua resposta falada aparece aqui...' : 'Digite sua resposta...'}
                  className="w-full min-h-28 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-400"
                />
                <div className="flex gap-3">
                  {question.kind === 'speaking' && (
                    <button
                      onClick={startSpeechRecognition}
                      disabled={isListening}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      {isListening ? 'Ouvindo...' : '🎤 Responder falando'}
                    </button>
                  )}
                  <button
                    onClick={() => lockAnswer({ responseText: typedAnswer.trim() })}
                    disabled={!typedAnswer.trim()}
                    className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Confirmar resposta
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 px-4 py-5 text-center space-y-3">
                <div className="text-5xl">{lastAnswerCorrect ? '✅' : '❌'}</div>
                <div className="text-lg font-bold text-white">{lastAnswerCorrect ? 'Correto!' : 'Resposta revelada'}</div>
                <div className="text-sm text-slate-300">
                  Resposta correta: <span className="font-bold text-green-400">{answerLabel || '—'}</span>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-black text-white"
                >
                  {questionIndex + 1 >= totalQuestions ? 'Finalizar treino' : 'Próxima pergunta'}
                </button>
              </div>
            )}

            <div className="flex justify-center gap-4 text-sm text-slate-400">
              <span>⏱ {Math.ceil(timeLeft)}s</span>
              <span>•</span>
              <span>{score.toLocaleString()} pts</span>
              <span>•</span>
              <span>🔥 {streak}</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
