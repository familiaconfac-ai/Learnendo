import React, { useEffect, useMemo, useRef, useState } from 'react';
import { appLangToTts, speak } from '../../../services/ttsService';
import { BattleParticipantAvatar } from './BattleParticipantAvatar';
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
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [musicMuted, setMusicMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const promptPlayedRef = useRef('');
  const recognitionRef = useRef<any>(null);

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
  const myScore = scores[uid];

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
    if (phase === 'question' && !musicMuted) {
      audio.play().catch(() => {});
      return;
    }
    audio.pause();
  }, [musicMuted, phase]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicMuted ? 0 : 0.4;
    }
  }, [musicMuted]);

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
      window.alert('Reconhecimento de voz nao esta disponivel neste navegador.');
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
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9200] flex flex-col bg-slate-950 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3">
        <div>
          <div className="text-sm font-black text-white">{template.title}</div>
          <div className="text-xs text-slate-400">
            {template.config.botEnabled ? 'Batalha contra bot' : 'Treino solo'} • {name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMusicMuted((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs transition hover:bg-slate-700"
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

      {phase === 'lobby' ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center">
            <div className="text-5xl">⚔️</div>
            <h2 className="text-2xl font-black text-white">Learnendo Battle</h2>
            <p className="text-sm text-slate-300">
              {template.questions.length} perguntas • {template.config.timePerQuestion}s por pergunta
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3">
                <div className="font-black text-orange-300">Dificuldade</div>
                <div className="mt-1 capitalize">{template.config.difficulty}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3">
                <div className="font-black text-cyan-300">Modo</div>
                <div className="mt-1">{template.config.botEnabled ? 'Bot ativo' : 'Solo'}</div>
              </div>
            </div>
            <button
              onClick={start}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 px-5 py-4 text-base font-black text-white"
            >
              Começar batalha
            </button>
          </div>
        </div>
      ) : question ? (
        <>
          <div className="h-1.5 bg-slate-800">
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${(timeLeft / template.config.timePerQuestion) * 100}%`,
                backgroundColor: timeLeft > template.config.timePerQuestion * 0.5 ? '#22c55e' : timeLeft > template.config.timePerQuestion * 0.25 ? '#f97316' : '#ef4444',
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
                Pergunta {questionIndex + 1} / {totalQuestions}
              </div>
              <div className="text-3xl font-bold leading-snug text-white">{question.text}</div>
              {question.imageUrl ? (
                <img
                  src={question.imageUrl}
                  alt="Question reference"
                  className="mx-auto max-h-48 w-auto rounded-xl border border-slate-700 bg-slate-900 object-contain"
                />
              ) : null}
              {question.kind === 'audio-choice' ? <p className="text-xs text-amber-300">Escute e escolha a alternativa correta.</p> : null}
              {question.kind === 'audio-open' ? <p className="text-xs text-amber-300">Escute e responda digitando.</p> : null}
              {question.kind === 'speaking' ? <p className="text-xs text-amber-300">Responda falando ou digitando.</p> : null}
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
                    Confirmar resposta
                  </button>
                ) : null}
              </>
            ) : phase === 'question' ? (
              <div className="w-full max-w-sm space-y-3">
                <textarea
                  value={typedAnswer}
                  onChange={(event) => setTypedAnswer(event.target.value)}
                  placeholder={question.kind === 'speaking' ? 'Sua resposta falada aparece aqui...' : 'Digite sua resposta...'}
                  className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-400"
                />
                <div className="flex gap-3">
                  {question.kind === 'speaking' ? (
                    <button
                      onClick={startSpeechRecognition}
                      disabled={isListening}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      {isListening ? 'Ouvindo...' : '🎤 Responder falando'}
                    </button>
                  ) : null}
                  <button
                    onClick={handleSubmitText}
                    disabled={!typedAnswer.trim()}
                    className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Confirmar resposta
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
                    {feedback.isTimeout ? 'Tempo esgotado' : feedback.humanResult.isCorrect ? 'Correto!' : 'Resposta revelada'}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    Resposta correta: <span className="font-bold text-green-400">{answerLabel || '—'}</span>
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
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Outros jogadores</p>
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
                  {questionIndex + 1 >= totalQuestions ? 'Ver resultado final' : 'Próxima pergunta'}
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
