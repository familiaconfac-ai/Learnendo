import React, { useEffect, useMemo, useRef, useState } from 'react';
import { appLangToTts, speak } from '../../../services/ttsService';
import { BattleParticipantAvatar } from './BattleParticipantAvatar';
import { BattleLabIndicators } from './BattleLabIndicators';
import { BattleResultsScreen } from './BattleResultsScreen';
import { usePracticeBattleEngine } from './battlePracticeEngine';
import type { SavedBattleTemplate } from './battleTypes';
import {
  BATTLE_BOT_UID,
  getBattleBotAvatarId,
  getBattleBotName,
  getBattleCorrectAnswerLabel,
  getBattleCorrectIndexes,
  getBattleLanguage,
  getBattlePromptAudioText,
  getBattleQuestionDuration,
  isChoiceQuestion,
} from './battleUtils';
import { createBattleThemeAudio, persistBattleVolume, readBattleVolume, type ManagedBattleAudio } from './battleAudio';

interface Props {
  template: SavedBattleTemplate;
  uid: string;
  name: string;
  isTeacher?: boolean;
  uiLanguage?: 'en' | 'pt' | 'es';
  onClose: () => void;
}

const PRACTICE_COPY = {
  en: {
    againstBot: 'Battle against bot',
    soloTraining: 'Solo training',
    enableMusic: 'Enable music',
    muteMusic: 'Mute music',
    musicVolume: 'Music volume',
    close: 'Close',
    title: 'Learnendo Battle',
    questions: 'questions',
    secondsEach: 'seconds each',
    difficulty: 'Difficulty',
    mode: 'Mode',
    botEnabled: 'Bot enabled',
    solo: 'Solo',
    startBattle: 'Start battle',
    question: 'Question',
    questionTime: 'Time for this question',
    audioChoiceHint: 'Listen and choose the correct answer.',
    audioOpenHint: 'Listen and answer by typing.',
    speakingHint: 'Answer by speaking or typing.',
    confirmAnswer: 'Confirm answer',
    speechPlaceholder: 'Your spoken answer appears here...',
    typedPlaceholder: 'Type your answer...',
    listening: 'Listening...',
    answerByVoice: 'Answer by voice',
    speechUnavailable: 'Voice recognition is not available in this browser.',
    timeUp: 'Time up',
    correct: 'Correct!',
    revealed: 'Answer revealed',
    correctAnswer: 'Correct answer',
    otherPlayers: 'Other players',
    finalResult: 'See final result',
    nextQuestion: 'Next question',
  },
  pt: {
    againstBot: 'Batalha contra bot',
    soloTraining: 'Treino solo',
    enableMusic: 'Ativar musica',
    muteMusic: 'Silenciar musica',
    musicVolume: 'Volume da musica',
    close: 'Fechar',
    title: 'Learnendo Battle',
    questions: 'perguntas',
    secondsEach: 'seg cada',
    difficulty: 'Dificuldade',
    mode: 'Modo',
    botEnabled: 'Bot ativo',
    solo: 'Solo',
    startBattle: 'Comecar batalha',
    question: 'Pergunta',
    questionTime: 'Tempo desta pergunta',
    audioChoiceHint: 'Escute e escolha a alternativa correta.',
    audioOpenHint: 'Escute e responda digitando.',
    speakingHint: 'Responda falando ou digitando.',
    confirmAnswer: 'Confirmar resposta',
    speechPlaceholder: 'Sua resposta falada aparece aqui...',
    typedPlaceholder: 'Digite sua resposta...',
    listening: 'Ouvindo...',
    answerByVoice: 'Responder falando',
    speechUnavailable: 'Reconhecimento de voz nao esta disponivel neste navegador.',
    timeUp: 'Tempo esgotado',
    correct: 'Correto!',
    revealed: 'Resposta revelada',
    correctAnswer: 'Resposta correta',
    otherPlayers: 'Outros jogadores',
    finalResult: 'Ver resultado final',
    nextQuestion: 'Proxima pergunta',
  },
  es: {
    againstBot: 'Batalla contra bot',
    soloTraining: 'Entrenamiento individual',
    enableMusic: 'Activar musica',
    muteMusic: 'Silenciar musica',
    musicVolume: 'Volumen de la musica',
    close: 'Cerrar',
    title: 'Batalla Learnendo',
    questions: 'preguntas',
    secondsEach: 'seg cada una',
    difficulty: 'Dificultad',
    mode: 'Modo',
    botEnabled: 'Bot activo',
    solo: 'Solo',
    startBattle: 'Iniciar batalla',
    question: 'Pregunta',
    questionTime: 'Tiempo de esta pregunta',
    audioChoiceHint: 'Escucha y elige la respuesta correcta.',
    audioOpenHint: 'Escucha y responde escribiendo.',
    speakingHint: 'Responde hablando o escribiendo.',
    confirmAnswer: 'Confirmar respuesta',
    speechPlaceholder: 'Tu respuesta hablada aparece aqui...',
    typedPlaceholder: 'Escribe tu respuesta...',
    listening: 'Escuchando...',
    answerByVoice: 'Responder hablando',
    speechUnavailable: 'El reconocimiento de voz no esta disponible en este navegador.',
    timeUp: 'Se acabo el tiempo',
    correct: 'Correcto!',
    revealed: 'Respuesta revelada',
    correctAnswer: 'Respuesta correcta',
    otherPlayers: 'Otros jugadores',
    finalResult: 'Ver resultado final',
    nextQuestion: 'Siguiente pregunta',
  },
} as const;

export const BattlePracticeView: React.FC<Props> = ({
  template,
  uid,
  name,
  isTeacher = false,
  uiLanguage = 'en',
  onClose,
}) => {
  const copy = PRACTICE_COPY[uiLanguage] ?? PRACTICE_COPY.en;
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [musicVolume, setMusicVolume] = useState<number>(() => readBattleVolume('learnendo_battle_practice_volume', 0.35));
  const audioRef = useRef<ManagedBattleAudio | null>(null);
  const promptPlayedRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const musicMuted = musicVolume <= 0.1;

  const human = useMemo(() => ({ uid, name }), [uid, name]);
  const opponents = useMemo(
    () => template.config.botEnabled
      ? [{
          uid: BATTLE_BOT_UID,
          name: getBattleBotName(template.config),
          avatarId: getBattleBotAvatarId(template.config),
          isBot: true,
        }]
      : [],
    [template.config],
  );

  const {
    phase,
    question,
    questionIndex,
    totalQuestions,
    timeLeft,
    scores,
    ranking,
    feedback,
    start,
    answer,
    next,
    restart,
  } = usePracticeBattleEngine({
    questions: template.questions,
    config: template.config,
    human,
    opponents,
  });

  const battleLanguage = getBattleLanguage(template.config.courseId);
  const answerLabel = question ? getBattleCorrectAnswerLabel(question) : '';
  const requiresChoiceConfirmation = question ? getBattleCorrectIndexes(question).length > 1 : false;
  const currentQuestionDuration = getBattleQuestionDuration(question, template.config);
  const myScore = scores[uid];

  useEffect(() => {
    const audio = createBattleThemeAudio(musicVolume);
    audioRef.current = audio;
    return () => {
      audio?.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    persistBattleVolume('learnendo_battle_practice_volume', musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (phase === 'question') {
      audio.start();
      return;
    }
    audio.stop();
  }, [phase]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setVolume(musicVolume);
    }
  }, [musicVolume]);

  useEffect(() => {
    setSelectedOptions([]);
    setTypedAnswer('');
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  }, [phase, questionIndex]);

  useEffect(() => {
    if (!question || phase !== 'question' || !question.playAudioOnce) return;
    const promptKey = `${template.id}:${question.id}:${phase}`;
    if (promptPlayedRef.current === promptKey) return;
    promptPlayedRef.current = promptKey;
    window.setTimeout(() => {
      speak(getBattlePromptAudioText(question), battleLanguage);
    }, 250);
  }, [battleLanguage, phase, question, template.id]);

  function startSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.alert(copy.speechUnavailable);
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

  function handleChoice(optionIndex: number) {
    if (!question || !isChoiceQuestion(question) || phase !== 'question') return;
    if (!requiresChoiceConfirmation) {
      setSelectedOptions([optionIndex]);
      answer({ optionIndex, optionIndexes: [optionIndex] });
      return;
    }

    setSelectedOptions((current) => (
      current.includes(optionIndex)
        ? current.filter((value) => value !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b)
    ));
  }

  function handleSubmitChoice() {
    if (selectedOptions.length === 0) return;
    answer({
      optionIndex: selectedOptions[0],
      optionIndexes: selectedOptions,
    });
  }

  function handleSubmitText() {
    if (!typedAnswer.trim()) return;
    answer({ responseText: typedAnswer.trim() });
  }

  if (phase === 'done') {
    return (
      <BattleResultsScreen
        scores={scores}
        myUid={uid}
        onClose={onClose}
        isTeacher={isTeacher}
        uiLanguage={uiLanguage}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9200] flex flex-col bg-slate-950 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3">
        <div>
          <div className="text-sm font-black text-white">{template.title}</div>
          <div className="text-xs text-slate-400">
            {template.config.botEnabled ? copy.againstBot : copy.soloTraining} • {name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMusicVolume((value) => value)}
            className="hidden"
            title={copy.musicVolume}
          >
            {musicMuted ? '🔇' : '🔉'}
          </button>
          <div className="flex items-center gap-2 rounded-full bg-slate-800 px-2 py-1">
            <span className="text-xs text-slate-300" title={copy.musicVolume}>🔊</span>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={Math.round(musicVolume * 100)}
              onChange={(event) => setMusicVolume(Number(event.target.value) / 100)}
              className="h-1.5 w-16 accent-orange-500"
              title={copy.musicVolume}
              aria-label={copy.musicVolume}
            />
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200"
          >
            {copy.close}
          </button>
        </div>
      </div>

      {phase === 'lobby' ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center">
            <div className="text-5xl">⚔️</div>
            <h2 className="text-2xl font-black text-white">{copy.title}</h2>
            <p className="text-sm text-slate-300">
              {template.questions.length} {copy.questions} • {template.config.timePerQuestion}s {copy.secondsEach}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3">
                <div className="font-black text-orange-300">{copy.difficulty}</div>
                <div className="mt-1 capitalize">{template.config.difficulty}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3">
                <div className="font-black text-cyan-300">{copy.mode}</div>
                <div className="mt-1">{template.config.botEnabled ? copy.botEnabled : copy.solo}</div>
              </div>
            </div>
            <BattleLabIndicators className="pt-1" />
            <button
              onClick={start}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 px-5 py-4 text-base font-black text-white"
            >
              {copy.startBattle}
            </button>
          </div>
        </div>
      ) : question ? (
        <>
          <div className="h-1.5 bg-slate-800">
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${(timeLeft / currentQuestionDuration) * 100}%`,
                backgroundColor: timeLeft > currentQuestionDuration * 0.5 ? '#22c55e' : timeLeft > currentQuestionDuration * 0.25 ? '#f97316' : '#ef4444',
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-800 bg-slate-900/70 px-3 py-2">
            {ranking.map((entry, index) => (
              <div
                key={entry.uid}
                className="flex min-w-[92px] items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-2 py-1"
              >
                <span className="text-[11px] font-black text-slate-400">{index + 1}º</span>
                <BattleParticipantAvatar
                  name={entry.name}
                  avatarId={entry.avatarId}
                  isBot={entry.isBot}
                  sizeClassName="h-6 w-6"
                  showBotBadge={entry.isBot}
                />
                <span className="truncate text-xs font-semibold text-white">{entry.name}</span>
                <span className="ml-auto text-xs font-black text-orange-300">{entry.score}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6">
            <div className="w-full max-w-md space-y-4 rounded-2xl bg-slate-800/80 p-6 text-center">
              <div className="text-xs uppercase tracking-wider text-slate-500">
                {copy.question} {questionIndex + 1} / {totalQuestions}
              </div>
              <div className="text-xs font-semibold text-orange-300">
                {copy.questionTime}: {currentQuestionDuration}s
              </div>
              <div className="text-3xl font-bold leading-snug text-white">{question.text}</div>
              {question.imageUrl ? (
                <img
                  src={question.imageUrl}
                  alt="Question reference"
                  className="mx-auto max-h-48 w-auto rounded-xl border border-slate-700 bg-slate-900 object-contain"
                />
              ) : null}
              {question.kind === 'audio-choice' ? <p className="text-xs text-amber-300">{copy.audioChoiceHint}</p> : null}
              {question.kind === 'audio-open' ? <p className="text-xs text-amber-300">{copy.audioOpenHint}</p> : null}
              {question.kind === 'speaking' ? <p className="text-xs text-amber-300">{copy.speakingHint}</p> : null}
            </div>

            {phase === 'question' && isChoiceQuestion(question) ? (
              <>
                <div className="grid w-full max-w-sm grid-cols-2 gap-3">
                  {(question.options ?? []).map((option, index) => (
                    <button
                      key={`${question.id}_${index}`}
                      onClick={() => handleChoice(index)}
                      className={`rounded-xl border-2 px-3 py-4 text-sm font-bold transition-all active:scale-95 ${
                        selectedOptions.includes(index)
                          ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                          : 'border-slate-600 text-white hover:border-orange-400 hover:bg-orange-400/10'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {requiresChoiceConfirmation ? (
                  <button
                    onClick={handleSubmitChoice}
                    disabled={selectedOptions.length === 0}
                    className="w-full max-w-sm rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {copy.confirmAnswer}
                  </button>
                ) : null}
              </>
            ) : phase === 'question' ? (
              <div className="w-full max-w-sm space-y-3">
                <textarea
                  value={typedAnswer}
                  onChange={(event) => setTypedAnswer(event.target.value)}
                  placeholder={question.kind === 'speaking' ? copy.speechPlaceholder : copy.typedPlaceholder}
                  className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-400"
                />
                <div className="flex gap-3">
                  {question.kind === 'speaking' ? (
                    <button
                      onClick={startSpeechRecognition}
                      disabled={isListening}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      {isListening ? copy.listening : `🎤 ${copy.answerByVoice}`}
                    </button>
                  ) : null}
                  <button
                    onClick={handleSubmitText}
                    disabled={!typedAnswer.trim()}
                    className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {copy.confirmAnswer}
                  </button>
                </div>
              </div>
            ) : feedback ? (
              <div className="w-full max-w-sm space-y-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-5">
                <div className={`rounded-2xl border px-4 py-4 ${feedback.humanResult.isCorrect ? 'border-green-700 bg-green-900/30' : 'border-rose-700 bg-rose-900/30'}`}>
                  <div className="text-2xl">
                    {feedback.isTimeout ? '⏱️' : feedback.humanResult.isCorrect ? '✅' : '❌'}
                  </div>
                  <div className="mt-2 text-lg font-black text-white">
                    {feedback.isTimeout ? copy.timeUp : feedback.humanResult.isCorrect ? copy.correct : copy.revealed}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    {copy.correctAnswer}: <span className="font-bold text-green-400">{answerLabel || '—'}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-orange-300">
                    {feedback.humanResult.isCorrect ? `+${feedback.humanResult.pointsEarned} pts` : '+0 pts'}
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      ({(feedback.humanResult.responseTimeMs / 1000).toFixed(1)}s)
                    </span>
                  </div>
                </div>

                {feedback.botResults.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">{copy.otherPlayers}</p>
                    {feedback.botResults.map((result) => (
                      <div
                        key={`${feedback.question.id}_${result.uid}`}
                        className="flex items-center gap-3 rounded-xl bg-slate-800 px-3 py-2.5"
                      >
                        <BattleParticipantAvatar
                          name={result.name}
                          avatarId={result.avatarId}
                          isBot={result.isBot}
                          sizeClassName="h-8 w-8"
                          showBotBadge={result.isBot}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{result.name}</p>
                          <p className="text-xs text-slate-400">{(result.responseTimeMs / 1000).toFixed(1)}s</p>
                        </div>
                        <span className={`text-sm font-black ${result.isCorrect ? 'text-green-400' : 'text-rose-400'}`}>
                          {result.isCorrect ? `+${result.pointsEarned}` : '0'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <button
                  onClick={next}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-black text-white"
                >
                  {questionIndex + 1 >= totalQuestions ? copy.finalResult : copy.nextQuestion}
                </button>
              </div>
            ) : null}

            <div className="flex justify-center gap-4 text-sm text-slate-400">
              <span>⏱ {Math.ceil(timeLeft)}s</span>
              <span>•</span>
              <span>{myScore?.score?.toLocaleString() ?? 0} pts</span>
              <span>•</span>
              <span>🔥 {myScore?.streak ?? 0}</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
