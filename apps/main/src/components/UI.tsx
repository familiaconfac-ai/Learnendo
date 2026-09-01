import React, { useState, useEffect, useRef } from 'react';
import { speak as ttsSpeakImpl, exerciseVoices, getVoiceCount, onVoicesReady, type TtsPlaybackHandle } from '../services/ttsService';
import { WORKBOOK_NUMBER } from '../constants';
import { PracticeItem, AnswerLog, OldUserProgress, PracticeModuleType } from '../types';
import { LESSON_CONFIGS, GRAMMAR_GUIDES, MODULE_ICONS, PRACTICE_ITEMS } from '../constants';
import { isFillInBlankExercise, resolveFullSentenceAfterAnswer, resolvePromptAudioText } from '../utils/fillInBlankAudio';
import { isWritingPromptResponseCorrect } from '../utils/writingPrompt';
import { classifySpeakingExercise, isSpeakingTemplateMatchAny, speakingTargets } from '../utils/speakingExercise';
import { isDictationWritingExercise, resolveSpokenOptionText } from '../utils/exerciseAudio';
import { resolveExerciseSpeechLocale } from '../utils/exerciseSpeechLocale';
import { reduceRepeatPlayback, repeatMicAvailable, type RepeatPlaybackState } from '../models/repeatPlaybackState';
import { expandAcceptedAnswerVariants } from '../utils/answerVariants';
import {
  isAnswerMatch,
  normalizeAnswer,
  normalizeSentenceAnswer,
  normalizeSpeakingAnswer,
  normalizeStrictWritingAnswer,
  isExactListeningWritingMatch,
  isCompleteSpeakingMatchAny,
  isSpeakingMatchAny,
} from '../utils/answerNormalization';
import speakerIcon from '../assets/icons/speaker.svg';
import turtleIcon from '../assets/icons/turtle.svg';
import backIcon from '../assets/icons/back.svg';
import checkIcon from '../assets/icons/check.svg';

const SUCCESS_SOUND = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3";
const ERR_SOUND = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";

const TRANSLATIONS: Record<string, string> = {};

const COLOR_STYLE_MAP: Record<string, string> = {
  'Red': 'text-red-500',
  'Blue': 'text-blue-700',
  'Green': 'text-green-600',
  'Yellow': 'text-yellow-400',
  'Orange': 'text-orange-500',
  'Purple': 'text-purple-600',
  'Black': 'text-slate-900',
  'White': 'text-slate-200'
};

// Maps color name strings to hex values for visual color-swatch answer options.
const OPTION_COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
  orange: '#f97316', black: '#1e1e2e', white: '#e2e8f0', purple: '#a855f7',
  pink: '#ec4899', brown: '#92400e', gray: '#6b7280', grey: '#6b7280',
};

const PT_DISPLAY_FIXES: Record<string, string> = {
  almoco: 'almoço',
  atencao: 'atenção',
  ciencias: 'ciências',
  comeca: 'começa',
  dicionarios: 'dicionários',
  esta: 'está',
  estao: 'estão',
  historia: 'história',
  ingles: 'inglês',
  laboratorio: 'laboratório',
  lapis: 'lápis',
  licao: 'lição',
  maos: 'mãos',
  manha: 'manhã',
  musica: 'música',
  nao: 'não',
  onibus: 'ônibus',
  portao: 'portão',
  regua: 'régua',
  silencio: 'silêncio',
};

const preserveReplacementCase = (original: string, replacement: string): string => {
  if (original.toUpperCase() === original) return replacement.toUpperCase();
  if (original[0] === original[0]?.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
};

const fixPortugueseSupportText = (value: string): string => {
  let fixed = value;
  Object.entries(PT_DISPLAY_FIXES).forEach(([source, target]) => {
    fixed = fixed.replace(new RegExp(`\\b${source}\\b`, 'gi'), (match) =>
      preserveReplacementCase(match, target),
    );
  });
  return fixed;
};

const renderInlineRichText = (text: string): React.ReactNode[] => {
  let nodeKey = 0;

  const parse = (value: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let index = 0;

    while (index < value.length) {
      if (value.startsWith('**', index)) {
        const end = value.indexOf('**', index + 2);
        if (end !== -1) {
          nodes.push(
            <strong key={`strong-${nodeKey++}`} className="font-black text-amber-200">
              {parse(value.slice(index + 2, end))}
            </strong>,
          );
          index = end + 2;
          continue;
        }
      }

      nodes.push(value[index]);
      index += 1;
    }

    return nodes;
  };

  return parse(text);
};

const getAcceptedAnswers = (item: Pick<PracticeItem, 'correctValue' | 'acceptedAnswers'>): string[] => {
  return expandAcceptedAnswerVariants([item.correctValue, ...(item.acceptedAnswers ?? [])]);
};

const QUESTION_CONTENT_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'am', 'be', 'by', 'can', 'could', 'did', 'do', 'does',
  'for', 'from', 'had', 'has', 'have', 'in', 'is', 'it', 'its', 'my', 'no', 'not', 'of',
  'on', 'or', 'our', 'she', 'he', 'i', 'the', 'their', 'there', 'they', 'this', 'those',
  'to', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with',
  'would', 'yes', 'you', 'your',
]);

const isQuestionPrompt = (value?: string): boolean => /\?$/.test((value ?? '').trim());

const getQuestionContentTokens = (value: string, lang?: string): string[] => {
  const normalized = normalizeSpeakingAnswer(value.replace(/\?+$/, ''), lang);
  return normalized
    .split(/\s+/)
    .filter((token) => token && !QUESTION_CONTENT_STOPWORDS.has(token));
};

const isExpandedQuestionResponseMatch = (
  response: string,
  acceptedAnswers: string[],
  question: string,
  lang?: string,
): boolean => {
  if (!isQuestionPrompt(question)) return false;

  const normalizedResponse = normalizeSpeakingAnswer(response, lang);
  const questionTokens = getQuestionContentTokens(question, lang);

  return acceptedAnswers.some((answer) => {
    const normalizedAnswer = normalizeSpeakingAnswer(answer, lang);
    const shortMatch = normalizedAnswer.match(/^(yes|no)\s+(.+)$/);
    if (!shortMatch) return false;

    const polarity = shortMatch[1];
    if (!normalizedResponse.startsWith(`${polarity} `)) return false;
    if (normalizedResponse === normalizedAnswer) return true;

    if (polarity === 'yes' && /\bnot\b/.test(normalizedResponse)) return false;
    if (polarity === 'no' && !/\bnot\b/.test(normalizedResponse)) return false;

    const responseTokens = new Set(normalizedResponse.split(/\s+/).filter(Boolean));
    const overlap = questionTokens.filter((token) => responseTokens.has(token));
    return new Set(overlap).size >= Math.min(2, questionTokens.length);
  });
};


const shuffle = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const Header: React.FC<{ lessonId: number, progress: OldUserProgress }> = ({ lessonId, progress }) => {
  const currentDiamond = progress?.lessonData?.[lessonId]?.diamond || 0;

  return (
    <header className="flex flex-col items-center mb-6 w-full max-w-sm mx-auto bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-sm border border-white">
      <div className="flex items-center justify-between w-full mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-[0_3px_0_0_#1e40af]">
            <i className="fas fa-bolt text-[10px]"></i>
          </div>
          <h1 className="text-sm font-black text-blue-900 uppercase tracking-tighter">Learnendo</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-orange-500 font-black text-xs">
            <i className="fas fa-fire"></i> {progress?.streakCount ?? 0}
          </div>
          <div className="flex items-center gap-1 text-blue-400 font-black text-xs">
            <i className="fas fa-snowflake"></i> {progress?.streakCount ?? 0}
          </div>
          <div className="flex items-center gap-1 text-blue-600 font-black text-xs">
            <i className="fas fa-gem"></i> {currentDiamond}
          </div>
          <div className="flex items-center gap-1 text-amber-500 font-black text-xs">
            <i className="fas fa-star"></i> {progress?.totalStars ?? 0}
          </div>
        </div>
      </div>
      <div className="w-full text-center border-t border-slate-100 pt-2">
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Workbook 1: Units 1 and 2</p>
      </div>
    </header>
  );
};

export const LearningPathView: React.FC<{
  progress: OldUserProgress;
  onSelectModule: (type: PracticeModuleType) => void;
  moduleNames: Record<string, string>;
  isLessonLocked: (id: number) => boolean;
  isModuleLocked: (type: PracticeModuleType) => boolean;
  islandWeights: number[];
  onBack?: () => void;
}> = ({ progress, onSelectModule, moduleNames, isLessonLocked, isModuleLocked, islandWeights, onBack }) => {
  const [selectedMod, setSelectedMod] = useState<PracticeModuleType | null>(null);
  const [mascotError, setMascotError] = useState(false);
  const currentLId = progress?.currentLesson;

  const lessonConfig =
    (LESSON_CONFIGS?.find(l => l.id === currentLId)) ||
    (LESSON_CONFIGS?.[0]);

  const lessonLocked = isLessonLocked(currentLId);

  const modules = (lessonConfig?.modules || []).map((type, idx) => {
    const score = progress?.lessonData?.[currentLId]?.islandScores?.[type] || 0;
    const max = PRACTICE_ITEMS.filter(i => i.moduleType === type).length;
    const locked = isModuleLocked(type);
    return {
      type: type as PracticeModuleType,
      mascot: idx === 0,
      icon: MODULE_ICONS[type] || 'fa-graduation-cap',
      color: locked ? 'bg-slate-300' : ['bg-amber-400', 'bg-orange-400', 'bg-red-400'][idx % 3],
      shadow: locked ? 'bg-slate-400' : ['bg-amber-600', 'bg-orange-600', 'bg-red-600'][idx % 3],
      isMastered: score >= max,
      score,
      max,
      locked,
    };
  });

  if (lessonLocked) {
    return (
      <div className="flex flex-col items-center py-20 text-center animate-in fade-in zoom-in">
        <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 text-5xl mb-6 shadow-inner">
          <i className="fas fa-lock"></i>
        </div>
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Lesson Locked</h2>
        <p className="text-slate-500 font-bold text-sm max-w-[240px]">Master 100% of the previous lesson and wait until tomorrow to unlock this path.</p>
        <button
          onClick={onBack}
          className="mt-8 px-8 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase shadow-lg text-xs"
        >
          Back to Training
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10 relative">
      {onBack && (
        <button onClick={onBack} className="mb-4 w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[0_6px_0_0_#1e40af] active:translate-y-1">
          Back to Lessons
        </button>
      )}
      <div className="absolute top-0 bottom-0 w-2 bg-slate-200 rounded-full left-1/2 -translate-x-1/2 -z-10" />

      {modules.map((mod, idx) => {
        const xPos = idx % 2 === 0 ? '-translate-x-12' : 'translate-x-12';

        return (
          <div key={mod.type} className={`mb-12 flex flex-col items-center ${xPos}`}>
            <div className="relative">
              {mod.mascot && mod.max > 0 && (
                mascotError ? (
                  <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl drop-shadow-xl">
                    <i className="fas fa-graduation-cap"></i>
                  </div>
                ) : (
                  <img
                    src="/mascot.png"
                    alt="Mascot"
                    onError={() => setMascotError(true)}
                    className="absolute -right-12 top-1/2 -translate-y-1/2 w-20 h-20 drop-shadow-xl pointer-events-none"
                  />
                )
              )}

              {mod.max === 0 ? (
                <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600 font-bold">
                  Content coming soon
                </div>
              ) : (
                <>
                  <div className={`absolute top-2 w-20 h-20 rounded-full ${mod.shadow} -z-10`} />

                  <button
                    onClick={() => !mod.locked && setSelectedMod(mod.type)}
                    disabled={mod.locked}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl transition-all hover:scale-105 ${mod.color} shadow-[inset_0_-8px_0_rgba(0,0,0,0.15)] active:translate-y-1 ${mod.locked ? 'cursor-not-allowed opacity-80' : ''} ${mod.isMastered ? 'scale-110 animate-pulse shadow-lg shadow-blue-500' : ''}`}
                  >
                    <i className={`fas ${mod.locked ? 'fa-lock' : mod.icon}`}></i>

                    {mod.isMastered && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-600 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-[10px] text-white">
                        <i className="fas fa-gem"></i>
                      </div>
                    )}
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-col items-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-center max-w-[90px] leading-tight text-slate-800">
                {moduleNames[mod.type] || "Tracking"}
              </p>
            </div>
          </div>
        );
      })}

      {selectedMod && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in slide-in-from-bottom-5">
            <h3 className="text-xl font-black text-slate-800 mb-4 uppercase tracking-tight">{moduleNames[selectedMod] || "Track Details"}</h3>
            <div className="space-y-3 mb-8">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Grammar Guide:</p>
              {(GRAMMAR_GUIDES[selectedMod] || ["Complete this track to master the concepts."])?.map((point, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <p className="text-xs font-bold text-slate-600 leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { onSelectModule(selectedMod); setSelectedMod(null); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[0_6px_0_0_#1e40af] active:translate-y-1">START TRACK</button>
              <button onClick={() => setSelectedMod(null)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── PracticeSection localised labels ───────────────────────────────
const PRACTICE_LABELS = {
  en: {
    praise: ['Excellent!', 'Great job!', 'Perfect!', 'Spot on!'],
    tryAgain: 'Try again!',
    speakNoMatch: "No, that's not it.",
    typeWord: 'Type the word!',
    typeWordFull: 'Type the word, not a digit.',
    fullSentence: 'Use a full sentence!',
    fullSentenceFull: 'Please write a full sentence.',
    correctAnswer: 'The correct answer is:',
    listenHint: '🔊 Listen to the audio for help!',
    continueBtn: 'CONTINUE',
    gotItBtn: 'GOT IT',
    speakPlaceholder: 'Say something or type...',
    unitLabel: (id: number) => `Unit ${id}`,
    lessonLabel: (id: number) => `Lesson ${id}`,
    exerciseLabel: (day: number, total: number) => `Exercise ${day} of ${total}`,
    exerciseIdxLabel: (idx: number, total: number) => `Exercise ${idx + 1} of ${total}`,
    // Section badges
    badgeReading: 'Reading',
    badgeWriting: 'Writing',
    badgeShadowing: 'Shadowing',
    badgeRepeat: 'Repeat',
    badgeSpeaking: 'Speaking',
    badgeListening: 'Listening',
    answerFullSentence: 'Answer in a Full Sentence',
    answerQuestion: 'Answer the question.',
    chooseCorrect: 'Choose the Correct Response',
    listenAndAnswer: 'Listen and answer',
    listenAndRepeat: 'Listen and repeat what you hear.',
    repeatInstruction: 'Listen first. When the audio finishes, repeat it.',
    whatColor: 'What color is it?',
  },
  pt: {
    praise: ['Excelente!', 'Muito bem!', 'Perfeito!', 'Correto!'],
    tryAgain: 'Tente novamente!',
    speakNoMatch: 'Não, não é isso.',
    typeWord: 'Digite a palavra!',
    typeWordFull: 'Digite a palavra, não um número.',
    fullSentence: 'Use uma frase completa!',
    fullSentenceFull: 'Por favor, escreva uma frase completa.',
    correctAnswer: 'A resposta correta é:',
    listenHint: '🔊 Ouça o áudio para ajuda!',
    continueBtn: 'CONTINUAR',
    gotItBtn: 'ENTENDI',
    speakPlaceholder: 'Fale ou escreva...',
    unitLabel: (id: number) => `Unidade ${id}`,
    lessonLabel: (id: number) => `Lição ${id}`,
    exerciseLabel: (day: number, total: number) => `Exercício ${day} de ${total}`,
    exerciseIdxLabel: (idx: number, total: number) => `Exercício ${idx + 1} de ${total}`,
    // Section badges
    badgeReading: 'Leitura',
    badgeWriting: 'Escrita',
    badgeShadowing: 'Repetição',
    badgeRepeat: 'Repetir',
    badgeSpeaking: 'Fala',
    badgeListening: 'Escuta',
    answerFullSentence: 'Responda em uma frase completa',
    answerQuestion: 'Responda a pergunta.',
    chooseCorrect: 'Escolha a resposta correta',
    listenAndAnswer: 'Ouça e responda',
    listenAndRepeat: 'Ouça e repita o que você ouviu.',
    repeatInstruction: 'Ouça primeiro. Quando o áudio terminar, repita.',
    whatColor: 'Qual é a cor?',
  },
  es: {
    praise: ['¡Excelente!', '¡Muy bien!', '¡Perfecto!', '¡Correcto!'],
    tryAgain: '¡Inténtalo de nuevo!',
    speakNoMatch: 'No, eso no es correcto.',
    typeWord: '¡Escribe la palabra!',
    typeWordFull: 'Escribe la palabra, no un número.',
    fullSentence: '¡Usa una oración completa!',
    fullSentenceFull: 'Por favor, escribe una oración completa.',
    correctAnswer: 'La respuesta correcta es:',
    listenHint: '🔊 ¡Escucha el audio para ayuda!',
    continueBtn: 'CONTINUAR',
    gotItBtn: 'ENTENDIDO',
    speakPlaceholder: 'Di algo o escribe...',
    unitLabel: (id: number) => `Unidad ${id}`,
    lessonLabel: (id: number) => `Lección ${id}`,
    exerciseLabel: (day: number, total: number) => `Ejercicio ${day} de ${total}`,
    exerciseIdxLabel: (idx: number, total: number) => `Ejercicio ${idx + 1} de ${total}`,
    // Section badges
    badgeReading: 'Lectura',
    badgeWriting: 'Escritura',
    badgeShadowing: 'Repetición',
    badgeRepeat: 'Repetir',
    badgeSpeaking: 'Habla',
    badgeListening: 'Escucha',
    answerFullSentence: 'Responde con una oración completa',
    answerQuestion: 'Responde la pregunta.',
    chooseCorrect: 'Elige la respuesta correcta',
    listenAndAnswer: 'Escucha y responde',
    listenAndRepeat: 'Escucha y repite lo que oyes.',
    repeatInstruction: 'Escucha primero. Cuando termine el audio, repite.',
    whatColor: '¿De qué color es?',
  },
} as const;
type PracticeLang = keyof typeof PRACTICE_LABELS;
const getPL = (lang: string) =>
  PRACTICE_LABELS[(lang as PracticeLang) in PRACTICE_LABELS ? (lang as PracticeLang) : 'en'];

export const PracticeSection: React.FC<{
    item: PracticeItem;
    onResult: (correct: boolean, val: string) => void;
    currentIdx: number;
  totalItems: number;
  lessonId: number;
  unitNumber?: number;
  onBack?: () => void;
  onGrammar?: () => void;
  onContextHelp?: () => void;
  dayNumber?: number;
  totalDays?: number;
  currentLanguage?: string;
  onAttempt?: (payload: { answer: string; isCorrect: boolean; attemptNumber: number }) => void;
    onContinue?: (payload: { answer: string; isCorrect: boolean; attemptNumber: number }) => void;
    actionLocked?: boolean;
    feedbackActionLocked?: boolean;
    persistCorrectFooterAction?: boolean;
    validateChoiceOnSelect?: boolean;
    allowContinueWithoutAnswer?: boolean;
    copyLanguage?: 'en' | 'pt' | 'es';
    lockWrongFeedbackImmediately?: boolean;
    retryReleaseVersion?: number;
    autoPlayAudio?: boolean;
    fullScreen?: boolean;
    embedded?: boolean;
    viewportTopOffset?: number;
    uiLanguage?: string;
  clickTranslatorMode?: boolean;
  onTranslatorWordSelect?: (payload: {
    word: string;
    rect: { top: number; left: number; bottom: number; right: number };
  }) => void;
}> =
  ({
    item,
    onResult,
    currentIdx,
    totalItems,
    lessonId,
    unitNumber,
    onBack,
    onGrammar,
    onContextHelp,
    dayNumber,
    totalDays,
    currentLanguage = 'en',
    onAttempt,
      onContinue,
      actionLocked = false,
      feedbackActionLocked = false,
      persistCorrectFooterAction = false,
      validateChoiceOnSelect = false,
      allowContinueWithoutAnswer = false,
      copyLanguage,
      lockWrongFeedbackImmediately = false,
      retryReleaseVersion = 0,
      autoPlayAudio = true,
      fullScreen = false,
      embedded = false,
      viewportTopOffset = 0,
      uiLanguage,
      clickTranslatorMode = false,
    onTranslatorWordSelect,
  }) => {
    const [userInput, setUserInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
    const [showFooter, setShowFooter] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [praiseText, setPraiseText] = useState('');
    const [localWrongFooterLocked, setLocalWrongFooterLocked] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const PL = getPL(copyLanguage || currentLanguage || uiLanguage);
    const exerciseSpeechLocale = resolveExerciseSpeechLocale(item, currentLanguage, uiLanguage);
    const instructionAudioText = item.instruction.trim();
    // Deterministic voice pair for this exercise: odd #→ female prompt, even #→ male prompt
    const { prompt: promptVoice, feedback: feedbackVoice } = exerciseVoices(currentIdx);

    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
    const [viewportHeight, setViewportHeight] = useState(() =>
      typeof window !== 'undefined' ? window.innerHeight : 800,
    );
    // Tracks whether the student has had at least one wrong attempt on this item.
    // Writing exercises reveal the audio hint only after the first wrong attempt.
    const [hasWrongAttempt, setHasWrongAttempt] = useState(false);
    const [audioStatus, setAudioStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [repeatPhase, setRepeatPhase] = useState<RepeatPlaybackState>('idle');

    // Dictation exercises: audio should be visible from the start; digits rejected
    // Catches English "you hear", Portuguese "ouvir", and Spanish "oyes" phrasings
    // so that the audio button is immediately available in all three languages.
    const isDictationWriting = isDictationWritingExercise(item);
    const isFinalTestListeningWriting = item.assessmentMode === 'listening-writing';
    const requiresExactListeningWriting = isFinalTestListeningWriting
      && item.instruction === 'Listen and write exactly what you hear.';

    const translation = item.translation ? fixPortugueseSupportText(item.translation) : '';
    const displayCorrectValue = fixPortugueseSupportText(item.correctValue);
    const promptAudioText = resolvePromptAudioText(item);
    const exerciseActionLocked = actionLocked || (isDictationWriting && audioStatus === 'loading');
    const speakingMode = item.type === 'speaking' ? classifySpeakingExercise(item) : null;
    const isShadowing = speakingMode === 'shadowing';
    const isRepeat = speakingMode === 'repeat';
    const isModeledSpeaking = isShadowing || isRepeat;
    const isInformalEnglish = item.pedagogicalTopic === 'informal-aint-recognition';
    const informalDialogueTitle = isInformalEnglish && item.displayValue?.startsWith('Dialogue 18')
      ? item.displayValue.split('\n')[0]
      : '';
    const isQuestionDrivenSpeaking = item.type === 'speaking' && isQuestionPrompt(promptAudioText || item.audioValue);
    const shadowingSupportText = isShadowing && isQuestionDrivenSpeaking ? translation : '';
    const speakingPlaceholder = item.responsePlaceholder?.trim() || (shadowingSupportText ? shadowingSupportText.replace(/\*\*/g, '') : '') || PL.speakPlaceholder;

    // Math writing exercises that require a full English sentence answer
    const isSentenceWriting = item.type === 'writing' &&
      item.instruction.toLowerCase().includes('full sentence');
    const isFillInBlank = isFillInBlankExercise(item);
    const isFillInBlankWriting = item.type === 'writing' && isFillInBlank;
    const fullSentenceAfterAnswer = item.fullSentenceAfterAnswer?.trim()
      || (isFillInBlank ? resolveFullSentenceAfterAnswer(item) : '');
    const activeAudioText =
      showFooter && feedback === 'correct' && fullSentenceAfterAnswer
        ? fullSentenceAfterAnswer
        : promptAudioText;
    const feedbackSentence = fullSentenceAfterAnswer && normalizeAnswer(fullSentenceAfterAnswer) !== normalizeAnswer(item.correctValue)
      ? fullSentenceAfterAnswer
      : '';

    // Reading exercises: displayValue contains a multi-line passage with translations
    const isReadingExercise = !!(item.displayValue?.includes('\n') && item.displayValue?.includes('('));

    // Color-option detection: all shuffled options are known color names → render swatches
    const isColorOptions = (item.type === 'multiple-choice' || item.type === 'identification') &&
      shuffledOptions.length > 0 &&
      shuffledOptions.every(opt => OPTION_COLOR_HEX[opt.toLowerCase()] !== undefined);

    // Pure color listening: no icon/image, just the audio + color squares (no text labels)
    const isPureColorListening = isColorOptions && !item.displayValue;
    const isListeningExercise = item.type === 'multiple-choice' || item.type === 'identification';
    const isShortViewport = viewportHeight <= 760;
    const useCompactChoiceGrid = isShortViewport && shuffledOptions.length >= 4 && shuffledOptions.every((opt) => opt.length <= 14);
    const practiceWidthClass = fullScreen
      ? 'max-w-sm sm:max-w-md md:max-w-lg'
      : 'max-w-md sm:max-w-xl';
    const footerWidthClass = fullScreen
      ? 'max-sm:max-w-xs max-w-sm sm:max-w-md md:max-w-lg'
      : 'max-w-md sm:max-w-xl';

    // Refs for STT lifecycle — prevents stale callbacks from bleeding across exercises
    const recRef = useRef<any>(null);
    const promptPlaybackRef = useRef<TtsPlaybackHandle | null>(null);
    const currentItemIdRef = useRef<string>(item.id);
    // Stores the onResult action prepared at CHECK time so Continue never reads stale state
    const pendingOnResultRef = useRef<(() => void) | null>(null);
    const primaryActionInFlightRef = useRef(false);
    const lastAttemptMetaRef = useRef<{ answer: string; isCorrect: boolean; attemptNumber: number } | null>(null);
    const previousFeedbackActionLockedRef = useRef(feedbackActionLocked);
    const previousRetryReleaseVersionRef = useRef(retryReleaseVersion);

    useEffect(() => {
      // Cancel any ongoing STT from the previous exercise so its callbacks can't
      // write a stale transcript into the new exercise's input.
      if (recRef.current) {
        try { recRef.current.abort(); } catch (_) {}
        recRef.current = null;
      }
      currentItemIdRef.current = item.id;
      pendingOnResultRef.current = null;
      lastAttemptMetaRef.current = null;

      setUserInput('');
      setIsListening(false);
      setFeedback('none');
      setShowFooter(false);
      setShowHint(false);
      setSelectedOption(null);
      setHasWrongAttempt(false);
      setLocalWrongFooterLocked(false);
      setAudioStatus(promptAudioText ? 'loading' : 'ready');
      promptPlaybackRef.current?.cancel();
      promptPlaybackRef.current = null;
      setRepeatPhase('idle');

      if (item.options && item.options.length > 0) {
        setShuffledOptions(shuffle(item.options));
      } else {
        setShuffledOptions([]);
      }

      // ── Diagnostic: log every autoplay trigger so cold-start issues are traceable ──
      if (promptAudioText) {
        const vc = getVoiceCount();
        console.log('[AUTOPLAY]', {
          origin: 'autoplay',
          exerciseId: item.id,
          type: item.type,
          currentLanguage,
          audioText: promptAudioText.slice(0, 60),
          voicesReady: vc > 0,
          voiceCount: vc,
          promptVoice,
          feedbackVoice,
        });
      }

      const _cleanups: Array<() => void> = [];

      if (autoPlayAudio && promptAudioText && item.type !== 'speaking' && item.type !== 'writing') {
        _cleanups.push(onVoicesReady(() => {
          setAudioStatus('ready');
          playPrompt(promptAudioText, 1, promptVoice, 'autoplay');
        }));
      } else if (autoPlayAudio && promptAudioText && item.type === 'speaking') {
        // ✅ Auto-play audio for speaking/shadowing exercises
        const t = setTimeout(() => {
          _cleanups.push(onVoicesReady(() => {
            setAudioStatus('ready');
            playPrompt(promptAudioText, 1, promptVoice, 'autoplay');
          }));
        }, 500);
        _cleanups.push(() => clearTimeout(t));
      } else if (autoPlayAudio && promptAudioText && isDictationWriting) {
        // Give short Bluetooth streams time to open before the meaningful words.
        const t = setTimeout(() => {
          _cleanups.push(onVoicesReady(() => {
            setAudioStatus('ready');
            playPrompt(promptAudioText, 1, promptVoice, 'autoplay');
          }));
        }, 500);
        _cleanups.push(() => clearTimeout(t));
      } else if (promptAudioText) {
        _cleanups.push(onVoicesReady(() => setAudioStatus('ready')));
      }
      // non-dictation writing: audio is only revealed after the first wrong attempt

      return () => {
        _cleanups.forEach(c => c());
        promptPlaybackRef.current?.cancel();
        promptPlaybackRef.current = null;
      };
    }, [item.id]);  // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (typeof window === 'undefined') return undefined;
      const updateViewportHeight = () => setViewportHeight(window.innerHeight);
      updateViewportHeight();
      window.addEventListener('resize', updateViewportHeight);
      return () => window.removeEventListener('resize', updateViewportHeight);
    }, []);

    useEffect(() => {
      const wasFeedbackLocked = previousFeedbackActionLockedRef.current;
      if (wasFeedbackLocked && !feedbackActionLocked && localWrongFooterLocked) {
        setLocalWrongFooterLocked(false);
      }
      previousFeedbackActionLockedRef.current = feedbackActionLocked;
    }, [feedbackActionLocked, localWrongFooterLocked]);

    useEffect(() => {
      if (
        retryReleaseVersion !== previousRetryReleaseVersionRef.current
        && localWrongFooterLocked
      ) {
        setLocalWrongFooterLocked(false);
      }
      previousRetryReleaseVersionRef.current = retryReleaseVersion;
    }, [localWrongFooterLocked, retryReleaseVersion]);

    const wrongFooterLocked = feedbackActionLocked || localWrongFooterLocked;
    const footerActionLocked = feedbackActionLocked || (feedback === 'wrong' && localWrongFooterLocked);

    useEffect(() => {
      if (exerciseActionLocked || showFooter || wrongFooterLocked) return undefined;

      const focusTimer = window.setTimeout(() => {
        const answerField = item.type === 'speaking'
          ? textareaRef.current
          : item.type === 'writing'
            ? inputRef.current
            : null;
        if (!answerField || answerField.disabled) return;
        answerField.focus({ preventScroll: true });
      }, 200);

      return () => window.clearTimeout(focusTimer);
    }, [exerciseActionLocked, item.id, item.type, showFooter, wrongFooterLocked]);

    // Auto-grow textarea
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (exerciseActionLocked) return;
      setUserInput(e.target.value);
      if (feedback === 'wrong') { setFeedback('none'); setShowFooter(false); }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
      }
    };

    // Voice language is pedagogical: explicit exercise locale, then course language.
    // uiLanguage is intentionally never allowed to override exercise content.
    // voicePref allows callers to request a specific gender; falls back safely.
    function speak(
      text: string,
      rate = 1,
      voicePref?: 'male' | 'female',
      origin = 'interaction',
      lifecycle: { onStart?: () => void; onEnd?: () => void; onError?: (errorCode?: string) => void } = {},
    ) {
      const vc = getVoiceCount();
      console.log(
        `[EXERCISE SPEAK] ex#${currentIdx} lang=${exerciseSpeechLocale}` +
        ` | voicePair=(prompt:${promptVoice}, feedback:${feedbackVoice})` +
        ` | requested=${voicePref ?? 'any'} | rate=${rate}` +
        ` | voiceCount=${vc} | origin=${origin}` +
        ` | text="${text.slice(0, 50)}${text.length > 50 ? '\u2026' : ''}"`
      );
      return ttsSpeakImpl(text, exerciseSpeechLocale, {
        rate, voicePreference: voicePref, ...lifecycle,
        diagnostics: { exerciseType: item.assessmentMode ?? item.type, speechLanguage: item.speechLanguage },
      });
    }

    function playPrompt(text: string, rate: number, voicePref: 'male' | 'female', origin = 'interaction') {
      promptPlaybackRef.current?.cancel();
      if (isRepeat) setRepeatPhase('idle');
      setAudioStatus('loading');
      const playback = speak(text, rate, voicePref, origin, {
        onStart: () => { setAudioStatus('ready'); if (isRepeat) setRepeatPhase((state) => reduceRepeatPlayback(state, 'playStarted')); },
        onEnd: () => { setAudioStatus('ready'); if (isRepeat) setRepeatPhase((state) => reduceRepeatPlayback(state, 'playCompleted')); },
        onError: () => { setAudioStatus('error'); if (isRepeat) setRepeatPhase((state) => reduceRepeatPlayback(state, 'playFailed')); },
      });
      promptPlaybackRef.current = playback;
      void playback.promise.then((result) => {
        if (promptPlaybackRef.current !== playback) return;
        if (result.state === 'cancelled' && isRepeat) setRepeatPhase('playbackError');
      });
    }

    const handleSTT = () => {
      if (exerciseActionLocked) return;
      if (isRepeat && !repeatMicAvailable(repeatPhase)) return;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return alert("Mic not supported");

      // Abort any previous recognition before starting a new one
      if (recRef.current) {
        try { recRef.current.abort(); } catch (_) {}
      }

      const capturedItemId = item.id; // capture for stale-closure guard below
      const rec = new SpeechRecognition();
      recRef.current = rec;
      rec.lang = exerciseSpeechLocale;
      rec.onstart = () => { setIsListening(true); if (isRepeat) setRepeatPhase((state) => reduceRepeatPlayback(state, 'recordStarted')); };

      rec.onresult = (e: any) => {
        if (currentItemIdRef.current !== capturedItemId) return; // stale callback
        setUserInput(e?.results?.[0]?.[0]?.transcript ?? "");
        setIsListening(false);
        if (isRepeat) setRepeatPhase((state) => reduceRepeatPlayback(state, 'recordCompleted'));
      };

      rec.onend = () => {
        if (currentItemIdRef.current !== capturedItemId) return;
        setIsListening(false);
      };

      rec.onerror = () => {
        if (currentItemIdRef.current !== capturedItemId) return;
        setIsListening(false);
      };

      rec.start();
    };

    const handleCheck = (answerOverride?: string) => {
      if (exerciseActionLocked) return;
      if (isRepeat && !repeatMicAvailable(repeatPhase)) return;
      // Dismiss keyboard immediately so the footer is at its final position
      // before the CONTINUE button renders — prevents the "double-tap" ghost click.
      inputRef.current?.blur();
      textareaRef.current?.blur();

      const rawInput = answerOverride ?? (userInput || selectedOption || '');
      if (isRepeat) setRepeatPhase('evaluating');
      if (!rawInput.trim() && allowContinueWithoutAnswer) {
        onContinue?.({
          answer: '',
          isCorrect: false,
          attemptNumber: lastAttemptMetaRef.current?.attemptNumber ?? 0,
        });
        return;
      }
      // Exact Final Test transcription must use only authored targets. General
      // variant expansion can introduce contractions or paraphrases not heard.
      const acceptedAnswers = requiresExactListeningWriting
        ? [item.correctValue, ...(item.acceptedAnswers ?? [])]
        : getAcceptedAnswers(item);
      const acceptedSpeakingTargets = isModeledSpeaking ? speakingTargets(item) : acceptedAnswers;
      const nextAttemptNumber = (lastAttemptMetaRef.current?.attemptNumber ?? 0) + 1;
      const reportAttempt = (answer: string, isCorrect: boolean) => {
        const payload = { answer, isCorrect, attemptNumber: nextAttemptNumber };
        lastAttemptMetaRef.current = payload;
        onAttempt?.(payload);
      };
      const prepareCorrectAction = (answer: string) => {
        pendingOnResultRef.current = () => {
          const payload = lastAttemptMetaRef.current;
          if (payload) onContinue?.(payload);
          onResult(true, answer);
        };
      };

      // Dictation writing: reject pure numeric input — student must type words
      if (isDictationWriting && !isFinalTestListeningWriting && /^\s*\d[\d\s]*$/.test(rawInput)) {
        reportAttempt(rawInput, false);
        setFeedback('wrong');
        setShowFooter(true);
        if (lockWrongFeedbackImmediately) setLocalWrongFooterLocked(true);
        new Audio(ERR_SOUND).play().catch(() => {});
        setPraiseText(PL.typeWord);
        speak(PL.typeWordFull, 1, feedbackVoice);
        setHasWrongAttempt(true);
        return;
      }

      if (isDictationWriting) {
        const normalizedInput = normalizeStrictWritingAnswer(rawInput);
        const isStrictWritingCorrect = acceptedAnswers.some((answer) =>
          requiresExactListeningWriting
            ? isExactListeningWritingMatch(rawInput, acceptedAnswers)
            : normalizeStrictWritingAnswer(answer) === normalizedInput
        );
        reportAttempt(rawInput, isStrictWritingCorrect);
        setFeedback(isStrictWritingCorrect ? 'correct' : 'wrong');
        setShowFooter(true);
        if (isStrictWritingCorrect) {
          prepareCorrectAction(rawInput);
          new Audio(SUCCESS_SOUND).play().catch(() => {});
          const p = PL.praise[Math.floor(Math.random() * PL.praise.length)];
          setPraiseText(p);
          speak(p, 1, feedbackVoice);
        } else {
          new Audio(ERR_SOUND).play().catch(() => {});
          setPraiseText(PL.tryAgain);
          speak(PL.speakNoMatch, 1, feedbackVoice);
          setHasWrongAttempt(true);
          if (lockWrongFeedbackImmediately) setLocalWrongFooterLocked(true);
        }
        return;
      }

      // Sentence writing (math): answer must be a complete English sentence
      if (isSentenceWriting) {
        if (/^\s*\d[\d\s]*$/.test(rawInput)) {
          reportAttempt(rawInput, false);
          setFeedback('wrong');
          setShowFooter(true);
          new Audio(ERR_SOUND).play().catch(() => {});
          setPraiseText(PL.fullSentence);
          speak(PL.fullSentenceFull, 1, feedbackVoice);
          setHasWrongAttempt(true);
          return;
        }
        const isSentenceCorrect = acceptedAnswers.some(
          (answer) => normalizeSentenceAnswer(rawInput, currentLanguage) === normalizeSentenceAnswer(answer, currentLanguage),
        );
        reportAttempt(rawInput, isSentenceCorrect);
        setFeedback(isSentenceCorrect ? 'correct' : 'wrong');
        setShowFooter(true);
        if (isSentenceCorrect) {
          prepareCorrectAction(rawInput);
          new Audio(SUCCESS_SOUND).play().catch(() => {});
          const p = PL.praise[Math.floor(Math.random() * PL.praise.length)];
          setPraiseText(p);
          speak(p, 1, feedbackVoice);
        } else {
          new Audio(ERR_SOUND).play().catch(() => {});
          setPraiseText(PL.tryAgain);
          speak(PL.speakNoMatch, 1, feedbackVoice);
          setHasWrongAttempt(true);
          if (lockWrongFeedbackImmediately) setLocalWrongFooterLocked(true);
        }
        return;
      }

      const isCorrect = item.type === 'speaking'
        ? (
            (item.requiresCompleteSpokenAnswer
              ? isCompleteSpeakingMatchAny(rawInput, acceptedSpeakingTargets, currentLanguage)
              : isSpeakingMatchAny(rawInput, acceptedSpeakingTargets, currentLanguage))
            || isSpeakingTemplateMatchAny(rawInput, acceptedSpeakingTargets, currentLanguage)
            || (!isModeledSpeaking && isExpandedQuestionResponseMatch(rawInput, acceptedAnswers, promptAudioText || item.audioValue, currentLanguage))
          )
        : item.type === 'writing' && item.promptMode
          ? isWritingPromptResponseCorrect(item, rawInput, currentLanguage)
          : acceptedAnswers.some((answer) => isAnswerMatch(rawInput, answer, currentLanguage));

      reportAttempt(rawInput, isCorrect);
      setFeedback(isCorrect ? 'correct' : 'wrong');
      setShowFooter(true);
      if (isRepeat) setRepeatPhase('feedback');

      if (isCorrect) {
        prepareCorrectAction(rawInput);
        new Audio(SUCCESS_SOUND).play().catch(() => { });
        const p = PL.praise[Math.floor(Math.random() * PL.praise.length)];
        setPraiseText(p);
        speak(p, 1, feedbackVoice);
      } else {
        new Audio(ERR_SOUND).play().catch(() => { });
        setPraiseText(PL.tryAgain);
        speak(PL.speakNoMatch, 1, feedbackVoice);
        if (item.type === 'writing') setHasWrongAttempt(true);
        if (lockWrongFeedbackImmediately) setLocalWrongFooterLocked(true);
      }
    };

    // ✅ Handle ENTER key
    const performFooterAction = () => {
      if (footerActionLocked || primaryActionInFlightRef.current) return;
      primaryActionInFlightRef.current = true;
      if (feedback === 'correct') {
        const cb = pendingOnResultRef.current;
        if (!persistCorrectFooterAction) pendingOnResultRef.current = null;
        cb?.();
      } else {
        setFeedback('none');
        setShowFooter(false);
      }
      window.setTimeout(() => { primaryActionInFlightRef.current = false; }, 0);
    };

    const performPrimaryAction = () => {
      if (exerciseActionLocked || primaryActionInFlightRef.current) return;
      if (showFooter) {
        performFooterAction();
        return;
      }
      if (allowContinueWithoutAnswer || (isMultipleChoice ? selectedOption : userInput.trim())) {
        primaryActionInFlightRef.current = true;
        handleCheck();
        window.setTimeout(() => { primaryActionInFlightRef.current = false; }, 0);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      performPrimaryAction();
    };

    useEffect(() => {
      const handleWindowKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' || event.defaultPrevented || event.repeat || event.isComposing) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('button, a, select, [role="button"], [contenteditable="true"]')) return;
        event.preventDefault();
        performPrimaryAction();
      };
      window.addEventListener('keydown', handleWindowKeyDown);
      return () => window.removeEventListener('keydown', handleWindowKeyDown);
    });

      const handleOptionClick = (opt: string) => {
        if (exerciseActionLocked) return;
        if (showFooter && (feedback === 'correct' || validateChoiceOnSelect)) return;
        if (wrongFooterLocked) return;
        if (clickTranslatorMode && onTranslatorWordSelect) return;
        setSelectedOption(opt);
        speak(resolveSpokenOptionText(opt), 1, promptVoice);
        if (feedback === 'wrong') {
          setShowFooter(false);
          setFeedback('none');
          setUserInput('');
        }
        if (validateChoiceOnSelect) {
          primaryActionInFlightRef.current = true;
          handleCheck(opt);
          window.setTimeout(() => { primaryActionInFlightRef.current = false; }, 0);
        }
      };

    const openTranslatorForWord = (
      rawWord: string,
      target: EventTarget | null,
      event?: {
        stopPropagation?: () => void;
        preventDefault?: () => void;
      },
    ) => {
      if (!clickTranslatorMode || !onTranslatorWordSelect) return;
      const normalizedWord = rawWord
        .trim()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (normalizedWord.length < 2) return;
      const element = target instanceof HTMLElement ? target : null;
      if (!element) return;
      event?.stopPropagation();
      event?.preventDefault?.();
      const rect = element.getBoundingClientRect();
      onTranslatorWordSelect({
        word: normalizedWord,
        rect: {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right,
        },
      });
    };

    const openTranslatorForSelection = (target: EventTarget | null) => {
      if (!clickTranslatorMode || !onTranslatorWordSelect) return;
      const element = target instanceof HTMLElement ? target : null;
      if (!element) return;

      window.setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().replace(/\s+/g, ' ').trim() ?? '';
        if (!selectedText || selectedText.length < 2) return;
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        if (!range) return;
        const commonNode = range.commonAncestorContainer;
        if (commonNode && !element.contains(commonNode)) return;

        const normalizedText = selectedText
          .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.?!]+$/gu, '')
          .trim();
        if (normalizedText.length < 2) return;

        const rect = range.getBoundingClientRect();
        const fallbackRect = element.getBoundingClientRect();
        onTranslatorWordSelect({
          word: normalizedText,
          rect: {
            top: rect.top || fallbackRect.top,
            left: rect.left || fallbackRect.left,
            bottom: rect.bottom || fallbackRect.bottom,
            right: rect.right || fallbackRect.right,
          },
        });
      }, 0);
    };

    const selectionGestureProps =
      clickTranslatorMode && onTranslatorWordSelect
        ? {
            onMouseUp: (event: React.MouseEvent<HTMLElement>) => openTranslatorForSelection(event.currentTarget),
            onTouchEnd: (event: React.TouchEvent<HTMLElement>) => openTranslatorForSelection(event.currentTarget),
          }
        : {};

    const renderInteractiveText = (
      text: string,
      options?: {
        wordClassName?: string;
        separatorClassName?: string;
      },
    ) => {
      const parts = text.split(/([\p{L}\p{N}'’-]+)/gu);
      return parts.map((part, index) => {
        if (!part) return null;
        const isWord = /[\p{L}\p{N}]/u.test(part);
        if (!isWord) {
          return (
            <span key={`${part}_${index}`} className={options?.separatorClassName}>
              {part}
            </span>
          );
        }

        const isTranslatorEnabled = clickTranslatorMode && Boolean(onTranslatorWordSelect);
        return (
          <span
            key={`${part}_${index}`}
            role={isTranslatorEnabled ? 'button' : undefined}
            tabIndex={isTranslatorEnabled ? 0 : undefined}
            className={`${options?.wordClassName ?? ''} ${
              isTranslatorEnabled
                ? 'cursor-pointer select-text rounded-lg px-0.5 transition hover:bg-cyan-500/20 hover:text-cyan-100'
                : ''
            }`}
            onClick={(event) => {
              if (!isTranslatorEnabled) return;
              const hasSelection = window.getSelection()?.toString().trim();
              if (hasSelection) return;
              openTranslatorForWord(part, event.currentTarget, event);
            }}
            onDoubleClick={(event) => {
              if (!isTranslatorEnabled) return;
              openTranslatorForWord(part, event.currentTarget, event);
            }}
            onKeyDown={(event) => {
              if (!isTranslatorEnabled) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openTranslatorForWord(part, event.currentTarget);
              }
            }}
          >
            {part}
          </span>
        );
      });
    };

    const renderDisplay = () => {
      if (item.displayValue?.startsWith('fa-')) {
        const colorClass = COLOR_STYLE_MAP[item.correctValue] || 'text-blue-900';
        return (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
            <div className={`${isColorOptions ? 'w-20 h-20' : 'w-32 h-32'} bg-slate-50 rounded-full flex items-center justify-center border-4 border-slate-100 shadow-inner`}>
              <i className={`fas ${item.displayValue} ${isColorOptions ? 'text-4xl' : 'text-6xl'} ${colorClass}`}></i>
            </div>
          </div>
        );
      }

      // Check if this is reading text (contains newlines and translations)
      const isReadingText = item.displayValue && item.displayValue.includes('\n') && item.displayValue.includes('(');

      if (isReadingText) {
        return (
          <div className="w-full max-w-sm mx-auto mb-4">
            <div className="max-h-[260px] overflow-y-auto bg-slate-800 p-5 rounded-2xl border-2 border-slate-600 shadow-inner">
              <div className={`text-xl font-bold text-center transition-colors duration-500 whitespace-pre-wrap leading-relaxed ${item.isNewVocab && !showFooter ? 'text-blue-400' : 'text-white'}`}>
                {renderInteractiveText(item.displayValue)}
              </div>
            </div>
          </div>
        );
      }

      // Color swatch for writing exercises: displayValue is a bare color name (e.g. 'red').
      // Renders a solid colored square so the student can identify the color without
      // seeing the word — keeping the question "What color is it?" genuinely productive.
      const swatchHex = OPTION_COLOR_HEX[(item.displayValue ?? '').toLowerCase()];
      if (swatchHex) {
        return (
          <div className="flex flex-col items-center animate-in fade-in duration-700">
            <div
              className={`${isShortViewport ? 'h-11 w-11' : 'h-12 w-12 sm:h-14 sm:w-14'} rounded-full border-[3px] border-slate-600 shadow-lg`}
              style={{ backgroundColor: swatchHex }}
            />
          </div>
        );
      }

      const cleanDisplayValue = item.type === 'speaking'
        ? item.displayValue?.replace(/^Question:\s*/i, '').trim()
        : item.displayValue;
      const displaySizeClass = isListeningExercise
        ? (isShortViewport ? 'text-xl leading-tight' : 'text-2xl sm:text-4xl')
        : (isShortViewport ? 'text-2xl leading-tight' : 'text-3xl sm:text-5xl');

      return (
        <div className={`${displaySizeClass} font-black mb-2 tracking-tighter text-center transition-colors duration-500 break-words ${clickTranslatorMode ? '' : 'select-none'} ${item.isNewVocab && !showFooter ? 'text-blue-400' : 'text-white'}`}>
          {renderInteractiveText(cleanDisplayValue ?? '')}
        </div>
      );
    };

    const isMultipleChoice = item.type === 'multiple-choice' || item.type === 'identification';

    return (
      <div
        data-practice-shell="true"
        className={`${embedded ? 'relative h-[min(72vh,720px)]' : fullScreen ? 'fixed inset-x-0 bottom-0' : 'fixed inset-x-0 top-[68px] bottom-[56px]'} no-scrollbar bg-slate-900 z-30 flex min-h-0 flex-col items-center overflow-y-auto overscroll-y-contain outline-none`}
        style={fullScreen ? { top: viewportTopOffset } : undefined}
      >
        <div className={`sticky top-0 z-20 w-full ${practiceWidthClass} max-sm:px-4 px-6 ${isShortViewport ? 'pt-1' : 'pt-2'} bg-slate-900/95 backdrop-blur-sm`}>
          {onBack && (
            <button
              onPointerDown={(e) => { e.preventDefault(); onBack(); }}
              className="mb-1 h-8 w-8 flex items-center justify-center text-white rounded-xl active:opacity-60 shrink-0 [touch-action:manipulation]"
              aria-label="Back"
            >
              <img src={backIcon} className="w-5 h-5 brightness-0 invert" alt="Back" />
            </button>
          )}
          {onGrammar && (
            <button
              onPointerDown={(e) => { e.preventDefault(); onGrammar(); }}
              className={`mb-2 mx-auto flex w-full max-w-[210px] items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 text-[clamp(0.7rem,1.8vw,0.875rem)] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_6px_18px_rgba(56,189,248,0.3)] transition-transform active:scale-95 [touch-action:manipulation] sm:max-w-[240px] ${isShortViewport ? 'py-1.5' : 'py-2'}`}
            >
              Grammar
            </button>
          )}
        </div>

        <div data-practice-scroll-region="true" className={`flex-1 min-h-fit w-full ${practiceWidthClass} px-4 sm:px-6 flex flex-col items-center ${isShortViewport ? 'pt-0.5 pb-2' : 'pt-1 pb-3'} overflow-visible`}>
          <div
            className={`relative group cursor-help w-full ${isShortViewport ? 'mb-1.5' : 'mb-2.5'}`}
            onClick={() => {
              if (!clickTranslatorMode) setShowHint(!showHint);
            }}
          >
            {item.contentOrder === 'display-first' && item.displayValue && !isDictationWriting && (
              <div className="mb-2 w-full" {...selectionGestureProps}>{renderDisplay()}</div>
            )}
            <button
              type="button"
              aria-label="Play instruction"
              title="Play instruction"
              onClick={(event) => {
                event.stopPropagation();
                speak(instructionAudioText, 1, promptVoice);
              }}
              className="absolute right-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-white shadow active:translate-y-0.5"
            >
              <img src={speakerIcon} className="h-4 w-4 brightness-0 invert" alt="" />
            </button>
            {isReadingExercise ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block px-3 py-1 text-base font-black text-emerald-300 bg-emerald-900/60 border border-emerald-700 rounded-full uppercase tracking-widest">{item.categoryLabel || PL.badgeReading}</span>
                <h2
                  className="text-lg sm:text-xl font-semibold text-white text-center leading-snug max-w-full break-words whitespace-pre-wrap"
                  {...selectionGestureProps}
                >
                  {renderInteractiveText(item.instruction.replace(/^(Read and write:|Read:)\s*/i, ''))}
                </h2>
              </div>
            ) : item.type === 'writing' && isSentenceWriting ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block px-3 py-1 text-base font-black text-blue-300 bg-blue-900/60 border border-blue-700 rounded-full uppercase tracking-widest">{item.categoryLabel || PL.badgeWriting}</span>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-0.5">{PL.answerFullSentence}</p>
                <h2
                  className="text-xl sm:text-2xl font-black text-yellow-400 text-center leading-snug max-w-full break-words whitespace-pre-wrap bg-slate-800/60 px-4 py-2 rounded-xl mt-1"
                  {...selectionGestureProps}
                >
                  {renderInteractiveText(item.instruction.replace(/\s*answer in a full sentence\.?/i, '').trim())}
                </h2>
              </div>
            ) : item.type === 'writing' ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block px-3 py-1 text-sm font-black text-blue-300 bg-blue-900/60 border border-blue-700 rounded-full uppercase tracking-widest">{item.categoryLabel || PL.badgeWriting}</span>
                <h2
                  className="text-lg sm:text-xl font-semibold text-white text-center leading-snug max-w-full break-words whitespace-pre-wrap"
                  {...selectionGestureProps}
                >
                  {renderInteractiveText(item.instruction)}
                </h2>
              </div>
            ) : item.type === 'speaking' && isRepeat ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block rounded-full border border-cyan-600 bg-cyan-950/70 px-3 py-1 text-sm font-black uppercase tracking-widest text-cyan-200">{item.categoryLabel || PL.badgeRepeat}</span>
                <h2 className="max-w-full text-center text-lg font-semibold leading-snug text-white sm:text-xl" {...selectionGestureProps}>
                  {renderInteractiveText(item.instruction || PL.repeatInstruction)}
                </h2>
              </div>
            ) : item.type === 'speaking' && isShadowing ? (
              <div className="flex flex-col items-center gap-2">
                {informalDialogueTitle && (
                  <p className="text-base font-black text-amber-200 text-center">
                    {informalDialogueTitle}
                  </p>
                )}
                {isInformalEnglish && (
                  <span className="inline-block px-3 py-1 text-xs font-black text-amber-200 bg-amber-950/70 border border-amber-500 rounded-full uppercase tracking-widest">
                    Informal Spoken English
                  </span>
                )}
                <span className="inline-block px-3 py-1 text-sm font-black text-green-300 bg-green-900/60 border border-green-700 rounded-full uppercase tracking-widest">{item.categoryLabel || PL.badgeShadowing}</span>
                <h2
                  className="text-lg sm:text-xl font-semibold text-white text-center leading-snug max-w-full break-words whitespace-pre-wrap"
                  {...selectionGestureProps}
                >
                  {renderInteractiveText(item.instruction || PL.listenAndRepeat)}
                </h2>
              </div>
            ) : item.type === 'speaking' ? (
              <div className="flex flex-col items-center gap-2">
                <span className={`inline-block px-3 py-1 text-sm font-black rounded-full uppercase tracking-widest ${
                  'text-orange-300 bg-orange-900/60 border border-orange-700'
                }`}>
                  {item.categoryLabel || PL.badgeSpeaking}
                </span>
                <h2
                  className="text-lg sm:text-xl font-semibold text-white text-center leading-snug max-w-full break-words whitespace-pre-wrap"
                  {...selectionGestureProps}
                >
                  {renderInteractiveText(item.instruction || PL.listenAndAnswer)}
                </h2>
              </div>
            ) : (
              /* multiple-choice and identification → Listening badge.
                 Dialogue items (instruction starts with "The teacher") get a
                 richer layout: subtitle + yellow-highlighted speech. */
              (() => {
                const dlg = item.instruction.match(/^(The teacher (?:says|asks)): "(.+?)" —/i);
                if (dlg) {
                  return (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            playPrompt(activeAudioText, 1, promptVoice);
                          }}
                          className={`${promptAudioText ? '' : 'hidden '}h-9 w-9 rounded-full border border-blue-500 bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] transition-all active:translate-y-1 flex items-center justify-center`}
                          title="Play audio"
                        >
                          <img src={speakerIcon} className="h-4 w-4 brightness-0 invert" alt="Play" />
                        </button>
                        <span className="inline-block px-3 py-1 text-sm font-black text-sky-300 bg-sky-900/60 border border-sky-700 rounded-full uppercase tracking-widest">{item.categoryLabel || PL.badgeListening}</span>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            playPrompt(activeAudioText, 0.5, feedbackVoice);
                          }}
                          className={`${promptAudioText ? '' : 'hidden '}h-9 w-9 rounded-full border border-orange-400 bg-orange-400 text-white shadow-[0_3px_0_0_#c2410c] transition-all active:translate-y-1 flex items-center justify-center`}
                          title="Slow pronunciation"
                        >
                          <img src={turtleIcon} className="h-4 w-4 brightness-0 invert" alt="Slow" />
                        </button>
                      </div>
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-0.5">{PL.chooseCorrect}</p>
                      <p className="text-sm font-semibold text-white text-center mt-1">{dlg[1]}:</p>
                      <h2
                        className="text-xl font-black text-yellow-400 text-center leading-snug max-w-full break-words whitespace-pre-wrap bg-slate-800/60 px-4 py-2 rounded-xl"
                        {...selectionGestureProps}
                      >
                        "{renderInteractiveText(dlg[2])}"
                      </h2>
                    </div>
                  );
                }
                // Color swatch question — structured Listening header
                if (OPTION_COLOR_HEX[(item.displayValue ?? '').toLowerCase()]) {
                  return (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            playPrompt(activeAudioText, 1, promptVoice);
                          }}
                          className={`${promptAudioText ? '' : 'hidden '}h-9 w-9 rounded-full border border-blue-500 bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] transition-all active:translate-y-1 flex items-center justify-center`}
                          title="Play audio"
                        >
                          <img src={speakerIcon} className="h-4 w-4 brightness-0 invert" alt="Play" />
                        </button>
                        <span className="inline-block px-3 py-1 text-sm font-black text-sky-300 bg-sky-900/60 border border-sky-700 rounded-full uppercase tracking-widest">{item.categoryLabel || PL.badgeListening}</span>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            playPrompt(activeAudioText, 0.5, feedbackVoice);
                          }}
                          className={`${promptAudioText ? '' : 'hidden '}h-9 w-9 rounded-full border border-orange-400 bg-orange-400 text-white shadow-[0_3px_0_0_#c2410c] transition-all active:translate-y-1 flex items-center justify-center`}
                          title="Slow pronunciation"
                        >
                          <img src={turtleIcon} className="h-4 w-4 brightness-0 invert" alt="Slow" />
                        </button>
                      </div>
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-0.5">{PL.whatColor}</p>
                      <h2
                        className="text-xl font-black text-yellow-400 text-center leading-snug max-w-full break-words whitespace-pre-wrap bg-slate-800/60 px-4 py-2 rounded-xl mt-1"
                        {...selectionGestureProps}
                      >
                        {renderInteractiveText(item.instruction)}
                      </h2>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          playPrompt(activeAudioText, 1, promptVoice);
                        }}
                        className={`${promptAudioText ? '' : 'hidden '}h-9 w-9 rounded-full border border-blue-500 bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] transition-all active:translate-y-1 flex items-center justify-center`}
                        title="Play audio"
                      >
                        <img src={speakerIcon} className="h-4 w-4 brightness-0 invert" alt="Play" />
                      </button>
                      <span className="inline-block px-3 py-1 text-sm font-black text-sky-300 bg-sky-900/60 border border-sky-700 rounded-full uppercase tracking-widest">{item.categoryLabel || PL.badgeListening}</span>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          playPrompt(activeAudioText, 0.5, feedbackVoice);
                        }}
                        className={`${promptAudioText ? '' : 'hidden '}h-9 w-9 rounded-full border border-orange-400 bg-orange-400 text-white shadow-[0_3px_0_0_#c2410c] transition-all active:translate-y-1 flex items-center justify-center`}
                        title="Slow pronunciation"
                      >
                        <img src={turtleIcon} className="h-4 w-4 brightness-0 invert" alt="Slow" />
                      </button>
                    </div>
                    <h2
                      className={`${isShortViewport ? 'text-base' : 'text-lg sm:text-xl'} font-semibold text-white text-center leading-snug max-w-full break-words whitespace-pre-wrap`}
                      {...selectionGestureProps}
                    >
                      {renderInteractiveText(item.instruction)}
                    </h2>
                  </div>
                );
              })()
            )}
            {translation && showHint && (
              <div className="pointer-events-none absolute -bottom-8 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-lg bg-white px-3 py-1.5 text-center text-[10px] font-bold text-slate-900 shadow animate-in fade-in slide-in-from-top-1 whitespace-normal">
                {renderInlineRichText(translation)}
              </div>
            )}
          </div>
          <div className={`flex flex-col items-center w-full ${isShortViewport ? 'gap-1.5' : 'gap-2.5 sm:gap-3'}`}>
            {/* ✅ Audio control buttons in correct order */}
            <div className={`flex ${isShortViewport ? 'gap-3' : 'gap-4'}`}>
              {promptAudioText && !isListeningExercise && (item.type !== 'writing' || isDictationWriting || isSentenceWriting || isFillInBlankWriting || hasWrongAttempt) && (
                <button onClick={() => playPrompt(activeAudioText, 1, promptVoice)} className={`${isShortViewport ? 'w-12 h-12' : 'w-14 h-14'} bg-blue-600 text-white rounded-2xl shadow-[0_4px_0_0_#1e40af] active:translate-y-1 transition-all flex items-center justify-center`} title="Play audio">
                  <img src={speakerIcon} className="w-6 h-6 brightness-0 invert" alt="Play" />
                </button>
              )}
              {promptAudioText && !isListeningExercise && (item.type !== 'writing' || isDictationWriting || isSentenceWriting || isFillInBlankWriting || hasWrongAttempt) && (
                <button onClick={() => playPrompt(activeAudioText, 0.5, feedbackVoice)} className={`${isShortViewport ? 'w-12 h-12' : 'w-14 h-14'} bg-orange-400 text-white rounded-2xl shadow-[0_4px_0_0_#c2410c] active:translate-y-1 transition-all flex items-center justify-center`} title="Slow pronunciation">
                  <img src={turtleIcon} className="w-6 h-6 brightness-0 invert" alt="Slow" />
                </button>
              )}
              {item.type === 'speaking' && (!isRepeat || repeatMicAvailable(repeatPhase)) && (
                <button 
                  onClick={handleSTT}
                  disabled={exerciseActionLocked || (showFooter && feedback === 'correct')}
                  className={`${isShortViewport ? 'w-12 h-12 text-xl' : 'w-14 h-14 text-2xl'} rounded-2xl active:translate-y-1 transition-all flex items-center justify-center ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_4px_0_0_#b91c1c]' : 'bg-red-500 text-white shadow-[0_4px_0_0_#991b1b] hover:bg-red-600'}`}
                  title="Tap to speak"
                >
                  <i className="fas fa-microphone"></i>
                </button>
              )}
            </div>
            {isRepeat && (repeatPhase === 'idle' || repeatPhase === 'playingPrompt') && (
              <p role="status" className="text-center text-xs font-bold text-cyan-200">{item.instruction || PL.repeatInstruction}</p>
            )}
            {isRepeat && repeatPhase === 'playbackError' && (
              <button type="button" onClick={() => { setRepeatPhase((state) => reduceRepeatPlayback(state, 'retry')); playPrompt(promptAudioText, 1, promptVoice, 'retry'); }} className="rounded-xl border border-red-300 bg-red-950/40 px-4 py-2 text-sm font-black text-red-100">
                Tentar ouvir novamente
              </button>
            )}
            {isDictationWriting && audioStatus === 'loading' && (
              <p role="status" className="text-xs font-bold text-blue-300">Preparing audio...</p>
            )}
            {isDictationWriting && audioStatus === 'error' && (
              <p role="alert" className="text-center text-xs font-bold text-red-300">
                Audio could not be played. Tap a playback button to try again.
              </p>
            )}

            {/* Listening dictation and shadowing should not reveal the target text visually. */}
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.imageAlt || ''} className="max-h-[min(34dvh,20rem)] w-full rounded-2xl object-contain" />
            )}
            {item.displayValue && item.contentOrder !== 'display-first' && !isModeledSpeaking && !isDictationWriting && (
              <div className="w-full" {...selectionGestureProps}>
                {renderDisplay()}
              </div>
            )}

            {item.contextVisual?.type === 'ordinal-line' && (
              <div className="w-full rounded-2xl border border-cyan-400/30 bg-slate-800/80 px-2 py-3" aria-label="People standing in ordinal positions">
                <div className="grid grid-cols-4 gap-1.5">
                  {item.contextVisual.people.map((person, index) => (
                    <div key={person} className="min-w-0 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-cyan-300 bg-gradient-to-b from-blue-400 to-blue-700 text-lg shadow-md" aria-hidden="true">{['👧', '👦', '👦', '👧'][index] ?? '🧑'}</div>
                      <p className="mt-1 truncate text-[11px] font-black text-white sm:text-sm">{person}</p>
                      <p className="text-[10px] font-bold uppercase text-cyan-300">{['1st', '2nd', '3rd', '4th'][index] ?? `${index + 1}th`}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {shadowingSupportText && (
              <div className="w-full rounded-3xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center shadow-[0_10px_30px_rgba(16,185,129,0.12)]">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Português
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-emerald-50">
                  {renderInlineRichText(shadowingSupportText)}
                </p>
              </div>
            )}

            {isMultipleChoice && shuffledOptions.length > 0 ? (
              isColorOptions ? (
                <div className="grid grid-cols-2 gap-3 w-full">
                  {shuffledOptions.map((opt) => {
                    const hex = OPTION_COLOR_HEX[opt.toLowerCase()] ?? '#6b7280';
                    const isSelected = selectedOption === opt;
                    return (
                      <button
                        key={opt}
                        disabled={exerciseActionLocked || wrongFooterLocked || (showFooter && feedback === 'correct')}
                        onClick={() => handleOptionClick(opt)}
                        aria-label={opt}
                        className={`rounded-2xl overflow-hidden border-4 transition-all [touch-action:manipulation] ${isSelected ? 'border-blue-400 shadow-lg ring-2 ring-blue-400' : 'border-slate-700 hover:border-blue-400'}`}
                      >
                        {isPureColorListening ? (
                          <div className="h-16 flex items-center justify-center" style={{ backgroundColor: hex }}>
                            {isSelected && (
                              <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center">
                                <i className="fas fa-check text-white text-sm"></i>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="h-11" style={{ backgroundColor: hex }} />
                            <div className={`py-2 text-center text-sm font-black uppercase tracking-wide ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'}`}>
                              {opt}
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
              <div data-practice-options="true" className={`grid ${useCompactChoiceGrid ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-1.5 sm:gap-2 w-full`}>
                {shuffledOptions.map((opt) => (
                  <button
                    key={opt}
                    disabled={exerciseActionLocked || wrongFooterLocked || (showFooter && feedback === 'correct')}
                    onPointerDown={(event) => {
                      if (clickTranslatorMode && onTranslatorWordSelect) {
                        openTranslatorForWord(opt, event.currentTarget, event);
                      }
                    }}
                    onClick={(event) => {
                      if (clickTranslatorMode && onTranslatorWordSelect) {
                        openTranslatorForWord(opt, event.currentTarget, event);
                        return;
                      }
                      handleOptionClick(opt);
                    }}
                    className={`${isShortViewport ? 'px-2 py-1.5 min-h-[42px]' : 'px-2.5 py-2 min-h-[46px]'} border-2 rounded-2xl font-bold transition-all flex items-center justify-center text-center leading-snug break-words [touch-action:manipulation] ${
                      opt.length > 14 ? 'text-[clamp(0.75rem,1.7vw,0.9rem)] normal-case' : 'text-[clamp(0.8rem,2vw,1.05rem)] font-black uppercase'
                    } ${selectedOption === opt ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-slate-800 border-slate-600 text-white hover:border-blue-500'}`}
                  >
                    <span className="whitespace-pre-wrap">{renderInteractiveText(opt)}</span>
                  </button>
                ))}
              </div>
              )
            ) : item.type === 'speaking' ? (
              <div className="w-full min-w-0 flex flex-col gap-2">
                {/* Auto-growing textarea for speaking exercises - moved below buttons */}
                <textarea
                  ref={textareaRef}
                  disabled={exerciseActionLocked || wrongFooterLocked || (isRepeat && !repeatMicAvailable(repeatPhase)) || (showFooter && feedback === 'correct')}
                  rows={1}
                  className={`block w-full max-w-full min-w-0 box-border overflow-x-hidden overflow-y-hidden whitespace-pre-wrap break-words px-3 py-2 border-2 rounded-2xl text-center text-lg leading-6 font-black focus:border-blue-500 outline-none transition-[border-color,height] resize-none min-h-[44px] max-h-32 [overflow-wrap:anywhere] ${feedback === 'wrong' ? 'bg-slate-800 border-red-500 text-red-400' : 'bg-slate-800 border-slate-600 text-white shadow-sm'}`}
                  value={userInput}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={speakingPlaceholder}
                  style={{ height: 'auto' }}
                />
              </div>
            ) : (
              <div className="w-full">
                <input
                  ref={inputRef}
                  disabled={exerciseActionLocked || wrongFooterLocked || (showFooter && feedback === 'correct')}
                  className={`w-full px-3 py-2.5 border-2 rounded-2xl text-center text-[clamp(1rem,3vw,1.35rem)] font-black focus:border-blue-500 outline-none transition-all ${feedback === 'wrong' ? 'bg-slate-800 border-red-500 text-red-400' : 'bg-slate-800 border-slate-600 text-white shadow-sm'}`}
                  value={userInput}
                  onChange={(e) => {
                    setUserInput(e.target.value);
                    if (feedback === 'wrong') { setFeedback('none'); setShowFooter(false); }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={item.promptMode === 'write-question' ? 'Type the question...' : '...'}
                />
              </div>
            )}
          </div>
        </div>

        {(!validateChoiceOnSelect || !isMultipleChoice || showFooter) && <div data-practice-footer="true" className={`sticky bottom-0 z-20 w-full shrink-0 ${isShortViewport ? 'px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]' : 'px-4 sm:px-6 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]'} flex flex-col items-center border-t-2 transition-all ${feedback === 'correct' ? 'bg-green-950 border-green-800' : feedback === 'wrong' ? 'bg-red-950 border-red-800' : 'bg-slate-900 border-slate-700'}`}>
          <div className={`w-full ${footerWidthClass}`}>
            {showFooter ? (
              <div className="flex flex-col gap-3">
                <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-4">
                  <div className="flex flex-col flex-1">
                    <div className={`font-black uppercase text-lg tracking-widest animate-in slide-in-from-left-2 ${feedback === 'correct' ? 'text-yellow-400' : 'text-white'}`}>
                      {praiseText}
                    </div>
                    {(feedback === 'correct' ? item.feedbackCorrect : item.feedbackIncorrect) && (
                      <div className="mt-1 text-xs font-bold text-white animate-in fade-in">
                        {feedback === 'correct' ? item.feedbackCorrect : item.feedbackIncorrect}
                      </div>
                    )}
                    {feedback === 'wrong' && (
                      <div className="text-white font-bold text-xs mt-1 animate-in fade-in">
                        {PL.correctAnswer} <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 font-black text-sm text-amber-300 underline decoration-2">{renderInlineRichText(displayCorrectValue)}</span>
                      </div>
                    )}
                    {feedback === 'wrong' && item.type === 'writing' && !isFillInBlankWriting && promptAudioText && hasWrongAttempt && (
                      <div className="text-blue-400 font-bold text-xs mt-1 animate-in fade-in">
                        {PL.listenHint}
                      </div>
                    )}
                    {(feedbackSentence || translation) && (
                      <div className="mt-2 space-y-1 animate-in fade-in">
                        {feedbackSentence ? (
                          <div className="text-xs font-bold text-white">
                            {feedbackSentence}
                          </div>
                        ) : null}
                        {translation ? (
                          <div className="text-xs font-bold italic text-slate-100">
                            {renderInlineRichText(translation)}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {onContextHelp && (
                      <button type="button" onClick={onContextHelp} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/70 bg-amber-400 text-lg text-slate-950 shadow-[0_3px_0_0_#b45309] active:translate-y-1 sm:h-12 sm:w-12 sm:rounded-2xl" aria-label="Grammar help and report problem" title="Grammar help">
                        <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
                      </button>
                    )}
                    <button
                      disabled={footerActionLocked}
                      onClick={performFooterAction}
                      className={`max-w-[8.5rem] px-3 py-2.5 sm:px-5 sm:py-3 ${feedback === 'correct' ? 'bg-blue-600' : 'bg-slate-800'} text-[11px] sm:text-sm text-white rounded-xl sm:rounded-2xl font-black uppercase shadow-[0_3px_0_0_rgba(0,0,0,0.2)] active:translate-y-1 transition-all [touch-action:manipulation] disabled:opacity-40 disabled:shadow-none disabled:translate-y-0`}
                    >
                      {feedback === 'correct' || validateChoiceOnSelect ? PL.continueBtn : PL.gotItBtn}
                    </button>
                  </div>
                </div>
              </div>
            ) : (!validateChoiceOnSelect || !isMultipleChoice) && (allowContinueWithoutAnswer || (isMultipleChoice ? selectedOption : userInput.trim())) ? (
              <div className="flex gap-3">
                <button
                  disabled={
                    actionLocked
                    || (!allowContinueWithoutAnswer && !(isMultipleChoice ? selectedOption : userInput.trim()))
                  }
                  onClick={performPrimaryAction}
                  className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[0_3px_0_0_#1e40af] active:translate-y-1 transition-all disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center [touch-action:manipulation]"
                >
                  {allowContinueWithoutAnswer && !(isMultipleChoice ? selectedOption : userInput.trim()) ? (
                    <span>{PL.continueBtn}</span>
                  ) : (
                    <img src={checkIcon} className="w-6 h-6 brightness-0 invert" alt="Check" />
                  )}
                </button>
              </div>
            ) : null}
          </div>
        </div>}
      </div>
    );
  };

export const ResultDashboard: React.FC<{
  score: number;
  totalTime: number;
  sentToTeacher?: boolean;
  currentLesson: number;
  onWhatsApp?: () => void;
  onNextLesson?: () => void;
  onRestart: () => void;
  isAdmin?: boolean;
  todayKey?: string;
  lastCompletionDayKey?: string;
}> = ({ score, totalTime, sentToTeacher, currentLesson, onWhatsApp, onNextLesson, onRestart, isAdmin, todayKey, lastCompletionDayKey }) => {
  const handleWA = () => {
    const text = `Learnendo Mastery: Lesson ${currentLesson} complete with Diamond ${score}/100 in ${Math.round(totalTime)}s!`;
    window.open(`https://wa.me/5517991010930?text=${encodeURIComponent(text)}`, '_blank');
    onWhatsApp?.();
  };

  const isMastered = score >= 100 || isAdmin;
  // Time-based lesson lock removed — next lesson unlocks immediately on completion.
  const isLockedByTime = false;

  return (
    <div className="p-10 text-center bg-white rounded-[3rem] shadow-2xl border-4 border-blue-50 animate-in zoom-in duration-300">
      <div className={`w-24 h-24 ${isMastered ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'} rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-lg`}>
        <i className={`fas ${isMastered ? 'fa-gem' : 'fa-gem opacity-40'}`}></i>
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter">
        {isMastered ? 'Unit Mastered!' : 'Almost There'}
      </h2>
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-8">Diamond Level: {score}/100</p>

      {!isMastered && (
        <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-100 mb-8 animate-pulse">
          <p className="text-xs font-black text-orange-600 uppercase tracking-tight">You made {score}/100 in this lesson. Repita para dominar (100/100).</p>
        </div>
      )}

      {isLockedByTime && (
        <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 mb-8">
          <p className="text-xs font-black text-blue-600 uppercase tracking-tight">Congratulations! Wait until tomorrow to unlock the next lesson.</p>
        </div>
      )}

      {isMastered && !sentToTeacher && (
        <button onClick={handleWA} className="w-full py-5 bg-green-500 text-white rounded-3xl font-black uppercase mb-4 shadow-[0_8px_0_0_#15803d] active:translate-y-1 transition-all">
          <i className="fab fa-whatsapp mr-2 text-xl"></i> Send to Teacher
        </button>
      )}

      {isMastered && currentLesson < 24 && !isLockedByTime && (
        <button onClick={onNextLesson} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase mb-4 shadow-[0_6px_0_0_#1e40af] active:translate-y-1 transition-all">
          Unlock Lesson {currentLesson + 1}
        </button>
      )}

      <button onClick={onRestart} className="w-full py-4 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase transition-all hover:bg-slate-200">
        Back to Path
      </button>
    </div>
  );
};

export const InfoSection: React.FC<{
  onStart: (name: string) => void;
  onAuthAction: (email: string, pass: string, isLogin: boolean, fullName?: string) => void
}> = ({ onStart, onAuthAction }) => {
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState('');

  const validateEmail = (e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  };

  const handleAuth = () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (!isLoginMode && !fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    onAuthAction(email, password, isLoginMode, fullName);
  };

  return (
    <div className="text-center py-10 flex flex-col items-center animate-in fade-in zoom-in">
      <div className="w-36 h-36 mb-10 bg-white rounded-3xl p-1 border-4 border-blue-100 shadow-2xl overflow-hidden relative group">
        <img
          src="https://img.freepik.com/free-vector/cyborg-face-concept_23-2148529452.jpg"
          alt="Learnendo AI Tutor"
          className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-blue-600/20 mix-blend-overlay"></div>
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Learnendo AI Tutor</h2>
      <div className="mb-8 space-y-1">
        <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Mastering Day by Day</p>
        <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em]">Workbook {WORKBOOK_NUMBER}</p>
      </div>

      <div className="w-full max-w-[320px] space-y-4">
        <div className="bg-white p-6 border-4 border-slate-100 rounded-[2.5rem] shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
            {isLoginMode ? 'Sign In' : 'Register'}
          </h3>
          {error && (
            <div className="text-[10px] font-bold text-red-500 uppercase animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}
          {!isLoginMode && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 font-bold text-sm focus:border-blue-500 outline-none transition-all"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 font-bold text-sm focus:border-blue-500 outline-none transition-all"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="w-full p-4 pr-20 border-2 border-slate-50 rounded-2xl bg-slate-50 font-bold text-sm focus:border-blue-500 outline-none transition-all"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-4 my-auto h-fit text-[10px] font-black uppercase tracking-wide text-blue-500 hover:text-blue-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <button
            onClick={handleAuth}
            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all"
          >
            {isLoginMode ? 'Login' : 'Sign Up'}
          </button>
          <button
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
          >
            {isLoginMode ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>

        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-1 bg-slate-100 rounded-full" />
          <span className="text-[10px] font-black text-slate-300 uppercase">Or continue as guest</span>
          <div className="flex-1 h-1 bg-slate-100 rounded-full" />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onStart(name); }} className="space-y-4">
          <input
            placeholder="What is your name?"
            className="w-full p-5 border-4 border-slate-100 rounded-3xl bg-white font-black text-center text-xl focus:border-blue-500 outline-none transition-all shadow-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xl shadow-[0_8px_0_0_#1e40af] active:translate-y-1 transition-all uppercase tracking-widest">
            START NOW
          </button>
        </form>
      </div>
    </div>
  );
};
