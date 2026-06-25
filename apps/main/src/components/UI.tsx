import React, { useState, useEffect, useRef } from 'react';
import { speak as ttsSpeakImpl, appLangToTts, exerciseVoices, getVoiceCount, onVoicesReady } from '../services/ttsService';
import { WORKBOOK_NUMBER } from '../constants';
import { PracticeItem, AnswerLog, OldUserProgress, PracticeModuleType } from '../types';
import { LESSON_CONFIGS, GRAMMAR_GUIDES, MODULE_ICONS, PRACTICE_ITEMS } from '../constants';
import { isFillInBlankExercise, resolveFullSentenceAfterAnswer, resolvePromptAudioText } from '../utils/fillInBlankAudio';
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

const NUMBER_MAP: Record<string, string> = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
  'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20',
  'one hundred': '100', 'one thousand': '1000'
};

// Portuguese and Spanish number-word → digit maps used in speaking/shadowing
// normalization so that STT digit output ("é 15") matches stored word form ("é quinze").
const PT_NUMBER_MAP: Record<string, string> = {
  'zero': '0', 'um': '1', 'uma': '1', 'dois': '2', 'duas': '2',
  'tres': '3', 'tr\u00eas': '3', 'quatro': '4', 'cinco': '5', 'seis': '6',
  'sete': '7', 'oito': '8', 'nove': '9', 'dez': '10', 'onze': '11',
  'doze': '12', 'treze': '13', 'quatorze': '14', 'quinze': '15',
  'dezesseis': '16', 'dezessete': '17', 'dezoito': '18', 'dezenove': '19',
  'vinte': '20',
};
const ES_NUMBER_MAP: Record<string, string> = {
  'cero': '0', 'uno': '1', 'una': '1', 'dos': '2', 'tres': '3',
  'cuatro': '4', 'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8',
  'nueve': '9', 'diez': '10', 'once': '11', 'doce': '12', 'trece': '13',
  'catorce': '14', 'quince': '15', 'diecis\u00e9is': '16', 'dieciseis': '16',
  'diecisiete': '17', 'dieciocho': '18', 'diecinueve': '19', 'veinte': '20',
};

const TIME_NORMALIZE_MAP: Record<string, string> = {
  '7:00': 'seven o clock', '7 o clock': 'seven o clock', 'seven oclock': 'seven o clock', '7 oclock': 'seven o clock',
  '7:30': 'seven thirty', '7 thirty': 'seven thirty', 'seven 30': 'seven thirty',
  '8:00': 'eight o clock', '8 o clock': 'eight o clock', 'eight oclock': 'eight o clock', '8 oclock': 'eight o clock',
  '9:00': 'nine o clock', '9 o clock': 'nine o clock', 'nine oclock': 'nine o clock', '9 oclock': 'nine o clock',
  '12:00': 'twelve o clock', '12 o clock': 'twelve o clock', 'twelve oclock': 'twelve o clock', '12 oclock': 'twelve o clock',
  '6:30': 'six thirty', '6 thirty': 'six thirty', 'six 30': 'six thirty',
  '5:00': 'five o clock', '5 o clock': 'five o clock', 'five oclock': 'five o clock', '5 oclock': 'five o clock',
  '3:00': 'three o clock', '3 o clock': 'three o clock', 'three oclock': 'three o clock', '3 oclock': 'three o clock'
};

const stripDiacritics = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const expandCommonContractions = (value: string): string => value
  .replace(/\bdoesn't\b/gi, 'does not')
  .replace(/\bdon't\b/gi, 'do not')
  .replace(/\bdidn't\b/gi, 'did not')
  .replace(/\bisn't\b/gi, 'is not')
  .replace(/\baren't\b/gi, 'are not')
  .replace(/\bwasn't\b/gi, 'was not')
  .replace(/\bweren't\b/gi, 'were not')
  .replace(/\bcan't\b/gi, 'can not')
  .replace(/\bcannot\b/gi, 'can not')
  .replace(/\bwon't\b/gi, 'will not')
  .replace(/\bit's\b/gi, 'it is');

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

const normalizeAnswer = (answer: string): string => {
  let normalized = stripDiacritics(expandCommonContractions(answer).toLowerCase().trim())
    // Normalize smart/curly apostrophes → ASCII apostrophe BEFORE stripping, so
    // "it\u2019s fifteen" (smart quote from editor auto-correct) is treated the same
    // as "it's fifteen" (ASCII). Without this, the prefix-strip regex ("its ") fails
    // and the speaking match returns false even when the answer is semantically correct.
    .replace(/[\u2018\u2019\u02BC\u2032]/g, "'")
    .replace(/[.,!?;:'\u00bf\u00a1]/g, "");  // \u00bf = \u00bf, \u00a1 = \u00a1

  // Strip sentence prefixes so "It is five." / "It's five." are accepted as "five"
  normalized = normalized.replace(/^(it is |its |the answer is |the result is |the number is )/, '');

  // Convert written numbers to digits
  Object.entries(NUMBER_MAP).forEach(([word, digit]) => {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
  });

  // Normalize time expressions
  Object.entries(TIME_NORMALIZE_MAP).forEach(([time, normalizedTime]) => {
    normalized = normalized.replace(new RegExp(time.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), normalizedTime);
  });

  // Handle common time variations
  normalized = normalized
    .replace(/\b(\d+):(\d+)\b/g, (match, hour, minute) => {
      if (minute === '00') return `${NUMBER_MAP[hour] || hour} o clock`;
      return `${NUMBER_MAP[hour] || hour} ${NUMBER_MAP[minute] || minute}`;
    })
    .replace(/\b(\d+)\s*o'?clock\b/g, (match, hour) => `${NUMBER_MAP[hour] || hour} o clock`)
    .replace(/\b(\d+)\s*thirty\b/g, (match, hour) => `${NUMBER_MAP[hour] || hour} thirty`)
    .replace(/\bseven\s*thirty\b/g, 'seven thirty')
    .replace(/\bsix\s*thirty\b/g, 'six thirty');

  return normalized;
};

const normalizeStrictWritingAnswer = (answer: string): string => {
  return stripDiacritics(expandCommonContractions(answer))
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u02BC\u2032]/g, "'")
    .replace(/[.,!?;:\u00bf\u00a1]+$/g, '')
    .replace(/\s+/g, ' ');
};

const getAcceptedAnswers = (item: Pick<PracticeItem, 'correctValue' | 'acceptedAnswers'>): string[] => {
  const all = [item.correctValue, ...(item.acceptedAnswers ?? [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return [...new Set(all)];
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

// Pre-processes time expressions for speaking/shadowing BEFORE punctuation stripping
const normalizeSpeakingAnswer = (answer: string, lang?: string): string => {
  let s = stripDiacritics(expandCommonContractions(answer).toLowerCase().trim());
  // Normalize smart/curly apostrophes → ASCII so they are stripped correctly
  // downstream. This fixes "it\u2019s twenty" (smart quote) = "It's 20" (STT output).
  s = s.replace(/[\u2018\u2019\u02BC\u2032]/g, "'");
  // Normalize a.m./p.m. dots → am/pm before punctuation is stripped
  s = s.replace(/\ba\.m\.\b/gi, 'am').replace(/\bp\.m\.\b/gi, 'pm');
  // No-space am/pm: "7am" / "8PM" → "7 am" / "8 pm"
  s = s.replace(/\b(\d+)(am|pm)\b/gi, '$1 $2');
  // Convert word-form numbers → digits first, so "eight o'clock" → "8 o'clock" below
  Object.entries(NUMBER_MAP).forEach(([word, digit]) => {
    s = s.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
  });
  // Apply language-specific number-word maps.  This converts PT/ES spoken forms
  // ("quinze", "quince") to digits so they match STT digit output ("15").
  // Both the stored correctValue and the STT transcript go through this so the
  // comparison is symmetric: "é quinze" → "15", "é 15" → "15" → equal. ✓
  const langNumMap = lang === 'pt' ? PT_NUMBER_MAP : lang === 'es' ? ES_NUMBER_MAP : null;
  if (langNumMap) {
    Object.entries(langNumMap).forEach(([word, digit]) => {
      s = s.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
    });
  }
  // Strip common PT/ES sentence-result prefixes (é/es) so "é 15" and "15" are equal
  if (lang === 'pt') s = s.replace(/^\u00e9\s+/, '');
  if (lang === 'es') {
    s = s.replace(/^es\s+/, '');
    // Defensive: if PT prefix "é " leaked into ES data, strip it too so normalization
    // still produces the right digit and the comparison doesn't silently fail.
    s = s.replace(/^\u00e9\s+/, '');
  }
  // Lang-specific math-operator symbols → word forms used in correctValue strings
  if (lang === 'pt') {
    s = s.replace(/\s*\+\s*/g, ' mais ');
    s = s.replace(/\s*[*\u00d7]\s*/g, ' vezes ');
    s = s.replace(/\s*\u00f7\s*/g, ' dividido por ');
  } else if (lang === 'es') {
    s = s.replace(/\s*\+\s*/g, ' m\u00e1s ');
    s = s.replace(/\s*[*\u00d7]\s*/g, ' por ');
    s = s.replace(/\s*\u00f7\s*/g, ' entre ');
  }
  // H:00 am/pm → H am/pm  ("7:00 am" → "7 am")
  s = s.replace(/\b(\d+):00\s*(am|pm)\b/gi, '$1 $2');
  // H:30 am/pm → H thirty am/pm  (before generic H:MM so "7:30 am" → "7 thirty am")
  s = s.replace(/\b(\d+):30\s*(am|pm)\b/gi, '$1 thirty $2');
  // H:MM am/pm → H MM am/pm (generic fallback)
  s = s.replace(/\b(\d+):(\d+)\s*(am|pm)\b/gi, '$1 $2 $3');
  // H:30 (no am/pm) → H thirty  ("7:30" → "7 thirty")
  s = s.replace(/\b(\d+):30\b/g, '$1 thirty');
  // H:00 (no am/pm) → H  ("7:00" → "7")
  s = s.replace(/\b(\d+):00\b/g, '$1');
  // H:MM (no am/pm) → H MM (generic fallback)
  s = s.replace(/\b(\d+):(\d+)\b/g, '$1 $2');
  // Bare "H 30" → "H thirty"  (STT often returns "7 30" for "seven thirty")
  s = s.replace(/\b(\d+)\s+30\b/g, '$1 thirty');
  // H o'clock / H o clock / H oclock → bare digit (flexible AM/PM matching)
  s = s.replace(/\b(\d+)\s*o'clock\b/gi, '$1');
  s = s.replace(/\b(\d+)\s*o\s+clock\b/gi, '$1');
  s = s.replace(/\b(\d+)\s*oclock\b/gi, '$1');
  // Math operator symbols → word equivalents.
  // STT on mobile often transcribes "+", "×", "*", "x" etc. instead of spoken words.
  // For PT/ES the operator mappings differ (mais/más, vezes/por, etc.) and are
  // already handled by the lang-specific block above — skip English ones for those.
  if (!lang || (lang !== 'pt' && lang !== 'es')) {
    s = s.replace(/\s*\+\s*/g, ' plus ');
    s = s.replace(/\s*[*×]\s*/g, ' times ');
    s = s.replace(/\s*÷\s*/g, ' divided by ');
  }
  // "/" only when flanked by digits (avoids breaking contractions like "it's")
  s = s.replace(/(\d)\s*\/\s*(\d)/g, '$1 divided by $2');
  // standalone "x" or "X" between operands used as multiplication sign
  s = s.replace(/\b([a-z0-9]+)\s+[xX]\s+([a-z0-9]+)\b/g, '$1 times $2');
  // collapse any double spaces introduced above
  s = s.replace(/\s{2,}/g, ' ').trim();
  return normalizeAnswer(s);
};

// Returns true when a speaking/shadowing response is semantically equivalent to the target.
// Accepts AM/PM variants and o'clock as interchangeable; rejects explicit AM↔PM swaps.
// lang: pass the active course language ('pt'/'es'/'en') for number-word equivalence.
const isSpeakingMatch = (response: string, target: string, lang?: string): boolean => {
  const normResp = normalizeSpeakingAnswer(response, lang);
  const normTarget = normalizeSpeakingAnswer(target, lang);
  if (normResp === normTarget) return true;
  // Explicit AM vs PM conflict → fail
  const hasAm = (s: string) => /\b\d+\s+am\b/.test(s);
  const hasPm = (s: string) => /\b\d+\s+pm\b/.test(s);
  if (hasAm(normTarget) && hasPm(normResp)) return false;
  if (hasPm(normTarget) && hasAm(normResp)) return false;
  // Strip am/pm from both sides and compare (handles o'clock ↔ am/pm equivalence)
  const stripAmPm = (s: string) => s.replace(/\s+(?:am|pm)\b/g, '').replace(/\s{2,}/g, ' ').trim();
  return stripAmPm(normResp) === stripAmPm(normTarget);
};

const isSpeakingMatchAny = (response: string, targets: string[], lang?: string): boolean => {
  return targets.some((target) => isSpeakingMatch(response, target, lang));
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
    badgeSpeaking: 'Speaking',
    badgeListening: 'Listening',
    answerFullSentence: 'Answer in a Full Sentence',
    answerQuestion: 'Answer the question.',
    chooseCorrect: 'Choose the Correct Response',
    listenAndAnswer: 'Listen and answer',
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
    badgeSpeaking: 'Fala',
    badgeListening: 'Escuta',
    answerFullSentence: 'Responda em uma frase completa',
    answerQuestion: 'Responda a pergunta.',
    chooseCorrect: 'Escolha a resposta correta',
    listenAndAnswer: 'Ouça e responda',
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
    badgeSpeaking: 'Habla',
    badgeListening: 'Escucha',
    answerFullSentence: 'Responde con una oración completa',
    answerQuestion: 'Responde la pregunta.',
    chooseCorrect: 'Elige la respuesta correcta',
    listenAndAnswer: 'Escucha y responde',
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
  dayNumber?: number;
  totalDays?: number;
  currentLanguage?: string;
  onAttempt?: (payload: { answer: string; isCorrect: boolean; attemptNumber: number }) => void;
    onContinue?: (payload: { answer: string; isCorrect: boolean; attemptNumber: number }) => void;
    actionLocked?: boolean;
    feedbackActionLocked?: boolean;
    persistCorrectFooterAction?: boolean;
    allowContinueWithoutAnswer?: boolean;
    copyLanguage?: 'en' | 'pt' | 'es';
    lockWrongFeedbackImmediately?: boolean;
    retryReleaseVersion?: number;
    autoPlayAudio?: boolean;
    fullScreen?: boolean;
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
    dayNumber,
    totalDays,
    currentLanguage = 'en',
    onAttempt,
      onContinue,
      actionLocked = false,
      feedbackActionLocked = false,
      persistCorrectFooterAction = false,
      allowContinueWithoutAnswer = false,
      copyLanguage,
      lockWrongFeedbackImmediately = false,
      retryReleaseVersion = 0,
      autoPlayAudio = true,
      fullScreen = false,
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

    // Dictation exercises: audio should be visible from the start; digits rejected
    // Catches English "you hear", Portuguese "ouvir", and Spanish "oyes" phrasings
    // so that the audio button is immediately available in all three languages.
    const isDictationWriting = item.type === 'writing' &&
      (item.instruction.toLowerCase().includes('you hear') ||
       item.instruction.toLowerCase().includes('ouvir') ||
       item.instruction.toLowerCase().includes('oyes'));

    const translation = item.translation ? fixPortugueseSupportText(item.translation) : '';
    const displayCorrectValue = fixPortugueseSupportText(item.correctValue);
    const isQuestionDrivenSpeaking = item.type === 'speaking' && isQuestionPrompt(promptAudioText || item.audioValue);
    // Shadowing exercises: repeated spoken response based on previous training.
    const isShadowing = item.type === 'speaking' && (
      !item.instruction.toLowerCase().includes('listen and answer')
      || item.instruction.toLowerCase().includes('short sentence')
      || isQuestionDrivenSpeaking
    );
    const shadowingSupportText = isShadowing && isQuestionDrivenSpeaking ? translation : '';
    const speakingPlaceholder = (shadowingSupportText ? shadowingSupportText.replace(/\*\*/g, '') : '') || PL.speakPlaceholder;

    // Math writing exercises that require a full English sentence answer
    const isSentenceWriting = item.type === 'writing' &&
      item.instruction.toLowerCase().includes('full sentence');
    const isFillInBlank = isFillInBlankExercise(item);
    const isFillInBlankWriting = item.type === 'writing' && isFillInBlank;
    const promptAudioText = resolvePromptAudioText(item);
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
    const currentItemIdRef = useRef<string>(item.id);
    // Stores the onResult action prepared at CHECK time so Continue never reads stale state
    const pendingOnResultRef = useRef<(() => void) | null>(null);
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
        _cleanups.push(onVoicesReady(() => speak(promptAudioText, 1, promptVoice)));
      } else if (autoPlayAudio && promptAudioText && item.type === 'speaking') {
        // ✅ Auto-play audio for speaking/shadowing exercises
        const t = setTimeout(() => {
          _cleanups.push(onVoicesReady(() => speak(promptAudioText, 1, promptVoice)));
        }, 500);
        _cleanups.push(() => clearTimeout(t));
      } else if (autoPlayAudio && promptAudioText && isDictationWriting) {
        // Dictation writing: play audio upfront so students can hear before typing
        _cleanups.push(onVoicesReady(() => speak(promptAudioText, 1, promptVoice)));
      }
      // non-dictation writing: audio is only revealed after the first wrong attempt

      setTimeout(() => {
        if (item.type === 'speaking') {
          textareaRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 200);
      return () => _cleanups.forEach(c => c());
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

    // Auto-grow textarea
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (actionLocked) return;
      setUserInput(e.target.value);
      if (feedback === 'wrong') { setFeedback('none'); setShowFooter(false); }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
      }
    };

    // Thin wrapper so existing call sites don't need changing.
    // Language comes from the currentLanguage prop set by ExercisePractice.
    // voicePref allows callers to request a specific gender; falls back safely.
    const speak = (text: string, rate = 1, voicePref?: 'male' | 'female', origin = 'interaction') => {
      const vc = getVoiceCount();
      console.log(
        `[EXERCISE SPEAK] ex#${currentIdx} lang=${currentLanguage}` +
        ` | voicePair=(prompt:${promptVoice}, feedback:${feedbackVoice})` +
        ` | requested=${voicePref ?? 'any'} | rate=${rate}` +
        ` | voiceCount=${vc} | origin=${origin}` +
        ` | text="${text.slice(0, 50)}${text.length > 50 ? '\u2026' : ''}"`
      );
      return ttsSpeakImpl(text, currentLanguage, { rate, voicePreference: voicePref });
    };

    const handleSTT = () => {
      if (actionLocked) return;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return alert("Mic not supported");

      // Abort any previous recognition before starting a new one
      if (recRef.current) {
        try { recRef.current.abort(); } catch (_) {}
      }

      const capturedItemId = item.id; // capture for stale-closure guard below
      const rec = new SpeechRecognition();
      recRef.current = rec;
      rec.lang = appLangToTts(currentLanguage);
      rec.onstart = () => setIsListening(true);

      rec.onresult = (e: any) => {
        if (currentItemIdRef.current !== capturedItemId) return; // stale callback
        setUserInput(e?.results?.[0]?.[0]?.transcript ?? "");
        setIsListening(false);
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

    const handleCheck = () => {
      if (actionLocked) return;
      // Dismiss keyboard immediately so the footer is at its final position
      // before the CONTINUE button renders — prevents the "double-tap" ghost click.
      inputRef.current?.blur();
      textareaRef.current?.blur();

      const rawInput = userInput || selectedOption || '';
      if (!rawInput.trim() && allowContinueWithoutAnswer) {
        onContinue?.({
          answer: '',
          isCorrect: false,
          attemptNumber: lastAttemptMetaRef.current?.attemptNumber ?? 0,
        });
        return;
      }
      const acceptedAnswers = getAcceptedAnswers(item);
      const nextAttemptNumber = (lastAttemptMetaRef.current?.attemptNumber ?? 0) + 1;
      const reportAttempt = (answer: string, isCorrect: boolean) => {
        const payload = { answer, isCorrect, attemptNumber: nextAttemptNumber };
        lastAttemptMetaRef.current = payload;
        onAttempt?.(payload);
      };

      // Dictation writing: reject pure numeric input — student must type words
      if (isDictationWriting && /^\s*\d[\d\s]*$/.test(rawInput)) {
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
        const isStrictWritingCorrect = acceptedAnswers.some(
          (answer) => normalizeStrictWritingAnswer(answer) === normalizedInput,
        );
        reportAttempt(rawInput, isStrictWritingCorrect);
        setFeedback(isStrictWritingCorrect ? 'correct' : 'wrong');
        setShowFooter(true);
        if (isStrictWritingCorrect) {
          pendingOnResultRef.current = () => {
            const payload = lastAttemptMetaRef.current;
            if (payload) onContinue?.(payload);
            onResult(true, rawInput);
          };
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
        const normSentence = (s: string) =>
          s.trim().toLowerCase().replace(/it'?s\s/g, 'it is ').replace(/[.,!?']/g, '').trim();
        const isSentenceCorrect = acceptedAnswers.some(
          (answer) => normSentence(rawInput) === normSentence(answer),
        );
        reportAttempt(rawInput, isSentenceCorrect);
        setFeedback(isSentenceCorrect ? 'correct' : 'wrong');
        setShowFooter(true);
        if (isSentenceCorrect) {
          pendingOnResultRef.current = () => {
            const payload = lastAttemptMetaRef.current;
            if (payload) onContinue?.(payload);
            onResult(true, rawInput);
          };
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

      const response = normalizeAnswer(rawInput);
      const normalizedTargets = acceptedAnswers.map(normalizeAnswer);

      const isCorrect = item.type === 'speaking'
        ? (
            isSpeakingMatchAny(rawInput, acceptedAnswers, currentLanguage)
            || isExpandedQuestionResponseMatch(rawInput, acceptedAnswers, promptAudioText || item.audioValue, currentLanguage)
          )
        : normalizedTargets.some((cleanTarget) =>
            (response === cleanTarget) ||
            (NUMBER_MAP[response] === cleanTarget) ||
            (NUMBER_MAP[cleanTarget] === response),
          );

      reportAttempt(rawInput, isCorrect);
      setFeedback(isCorrect ? 'correct' : 'wrong');
      setShowFooter(true);

      if (isCorrect) {
        pendingOnResultRef.current = () => {
          const payload = lastAttemptMetaRef.current;
          if (payload) onContinue?.(payload);
          onResult(true, rawInput);
        };
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
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (actionLocked) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          if (showFooter) {
            if (footerActionLocked) return;
            // If feedback is showing, trigger CONTINUE/GOT IT
            if (feedback === 'correct') {
              const cb = pendingOnResultRef.current;
              if (!persistCorrectFooterAction) {
                pendingOnResultRef.current = null;
              }
              cb?.();
          } else {
            setFeedback('none');
            setShowFooter(false);
          }
        } else {
          // If no feedback, trigger CHECK
          if (allowContinueWithoutAnswer || (isMultipleChoice ? selectedOption : userInput.trim())) {
            handleCheck();
          }
        }
      }
    };

      const handleOptionClick = (opt: string) => {
        if (actionLocked) return;
        if (showFooter && feedback === 'correct') return;
        if (wrongFooterLocked) return;
        if (clickTranslatorMode && onTranslatorWordSelect) return;
        setSelectedOption(opt);
      speak(opt, 1, promptVoice);
      if (feedback === 'wrong') {
        setShowFooter(false);
        setFeedback('none');
        setUserInput('');
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
              className="w-16 h-16 rounded-full border-4 border-slate-600 shadow-lg"
              style={{ backgroundColor: swatchHex }}
            />
          </div>
        );
      }

      const displaySizeClass = isListeningExercise
        ? (isShortViewport ? 'text-xl leading-tight' : 'text-2xl sm:text-4xl')
        : (isShortViewport ? 'text-2xl leading-tight' : 'text-3xl sm:text-5xl');

      return (
        <div className={`${displaySizeClass} font-black mb-2 tracking-tighter text-center transition-colors duration-500 break-words ${clickTranslatorMode ? '' : 'select-none'} ${item.isNewVocab && !showFooter ? 'text-blue-400' : 'text-white'}`}>
          {renderInteractiveText(item.displayValue)}
        </div>
      );
    };

    const isMultipleChoice = item.type === 'multiple-choice' || item.type === 'identification';

    return (
      <div
        className={`${fullScreen ? 'fixed inset-x-0 bottom-0' : 'fixed inset-x-0 top-[68px] bottom-[56px]'} bg-slate-900 z-30 flex min-h-0 flex-col items-center overflow-hidden outline-none`}
        style={fullScreen ? { top: viewportTopOffset } : undefined}
      >
        <div className={`w-full ${practiceWidthClass} max-sm:px-4 px-6 ${isShortViewport ? 'pt-3' : 'pt-5'}`}>
          <div className={`flex items-center gap-3 ${isShortViewport ? 'mb-3' : 'mb-4'}`}>
            {onBack && (
              <button
                onPointerDown={(e) => { e.preventDefault(); onBack(); }}
                className="w-9 h-9 flex items-center justify-center text-white rounded-xl active:opacity-60 shrink-0 [touch-action:manipulation]"
                aria-label="Back"
              >
                <img src={backIcon} className="w-5 h-5 brightness-0 invert" alt="Back" />
              </button>
            )}
            <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${totalItems > 0 ? (Math.min(currentIdx + 1, totalItems) / totalItems) * 100 : 0}%` }}
              />
            </div>
          </div>
          {onGrammar && (
            <button
              onPointerDown={(e) => { e.preventDefault(); onGrammar(); }}
              className={`mb-3 mx-auto flex w-full max-w-[210px] items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.35)] transition-transform active:scale-95 [touch-action:manipulation] sm:max-w-[240px] ${isShortViewport ? 'py-2.5' : 'py-3'}`}
            >
              Grammar Focus
            </button>
          )}
        </div>

        <div className={`flex-1 min-h-0 w-full ${practiceWidthClass} px-4 sm:px-6 flex flex-col items-center ${isShortViewport ? 'pt-1 pb-3' : 'pt-2 sm:pt-4 pb-6'} overflow-y-auto no-scrollbar`}>
          <div
            className={`relative group cursor-help w-full ${isShortViewport ? 'mb-3' : 'mb-4'}`}
            onClick={() => {
              if (!clickTranslatorMode) setShowHint(!showHint);
            }}
          >
            {isReadingExercise ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block px-3 py-1 text-base font-black text-emerald-300 bg-emerald-900/60 border border-emerald-700 rounded-full uppercase tracking-widest">{PL.badgeReading}</span>
                <h2
                  className="text-lg sm:text-xl font-semibold text-white text-center leading-snug max-w-full break-words whitespace-pre-wrap"
                  {...selectionGestureProps}
                >
                  {renderInteractiveText(item.instruction.replace(/^(Read and write:|Read:)\s*/i, ''))}
                </h2>
              </div>
            ) : item.type === 'writing' && isSentenceWriting ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block px-3 py-1 text-base font-black text-blue-300 bg-blue-900/60 border border-blue-700 rounded-full uppercase tracking-widest">{PL.badgeWriting}</span>
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
                <span className="inline-block px-3 py-1 text-sm font-black text-blue-300 bg-blue-900/60 border border-blue-700 rounded-full uppercase tracking-widest">{PL.badgeWriting}</span>
                <h2
                  className="text-lg sm:text-xl font-semibold text-white text-center leading-snug max-w-full break-words whitespace-pre-wrap"
                  {...selectionGestureProps}
                >
                  {renderInteractiveText(item.instruction)}
                </h2>
              </div>
            ) : item.type === 'speaking' && !item.instruction.toLowerCase().includes('listen and answer') ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block px-3 py-1 text-sm font-black text-green-300 bg-green-900/60 border border-green-700 rounded-full uppercase tracking-widest">{PL.badgeShadowing}</span>
                <h2
                  className="text-lg sm:text-xl font-semibold text-white text-center leading-snug max-w-full break-words whitespace-pre-wrap"
                  {...selectionGestureProps}
                >
                  {isQuestionDrivenSpeaking
                    ? PL.answerQuestion
                    : renderInteractiveText(item.instruction.replace(/^(Read and repeat:|Repeat:|Say:|Pronounce correctly:|Say the result:|Say the number:)\s*/i, ''))}
                </h2>
              </div>
            ) : item.type === 'speaking' ? (
              <div className="flex flex-col items-center gap-2">
                <span className={`inline-block px-3 py-1 text-sm font-black rounded-full uppercase tracking-widest ${
                  isQuestionDrivenSpeaking
                    ? 'text-green-300 bg-green-900/60 border border-green-700'
                    : 'text-orange-300 bg-orange-900/60 border border-orange-700'
                }`}>
                  {isQuestionDrivenSpeaking ? PL.badgeShadowing : PL.badgeSpeaking}
                </span>
                <h2
                  className="text-lg sm:text-xl font-semibold text-white text-center leading-snug max-w-full break-words"
                  {...selectionGestureProps}
                >
                  {isQuestionDrivenSpeaking ? PL.answerQuestion : PL.listenAndAnswer}
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
                            speak(activeAudioText, 1, promptVoice);
                          }}
                          className="h-9 w-9 rounded-full border border-blue-500 bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] transition-all active:translate-y-1 flex items-center justify-center"
                          title="Play audio"
                        >
                          <img src={speakerIcon} className="h-4 w-4 brightness-0 invert" alt="Play" />
                        </button>
                        <span className="inline-block px-3 py-1 text-sm font-black text-sky-300 bg-sky-900/60 border border-sky-700 rounded-full uppercase tracking-widest">{PL.badgeListening}</span>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            speak(activeAudioText, 0.5, feedbackVoice);
                          }}
                          className="h-9 w-9 rounded-full border border-orange-400 bg-orange-400 text-white shadow-[0_3px_0_0_#c2410c] transition-all active:translate-y-1 flex items-center justify-center"
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
                            speak(activeAudioText, 1, promptVoice);
                          }}
                          className="h-9 w-9 rounded-full border border-blue-500 bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] transition-all active:translate-y-1 flex items-center justify-center"
                          title="Play audio"
                        >
                          <img src={speakerIcon} className="h-4 w-4 brightness-0 invert" alt="Play" />
                        </button>
                        <span className="inline-block px-3 py-1 text-sm font-black text-sky-300 bg-sky-900/60 border border-sky-700 rounded-full uppercase tracking-widest">{PL.badgeListening}</span>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            speak(activeAudioText, 0.5, feedbackVoice);
                          }}
                          className="h-9 w-9 rounded-full border border-orange-400 bg-orange-400 text-white shadow-[0_3px_0_0_#c2410c] transition-all active:translate-y-1 flex items-center justify-center"
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
                          speak(activeAudioText, 1, promptVoice);
                        }}
                        className="h-9 w-9 rounded-full border border-blue-500 bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] transition-all active:translate-y-1 flex items-center justify-center"
                        title="Play audio"
                      >
                        <img src={speakerIcon} className="h-4 w-4 brightness-0 invert" alt="Play" />
                      </button>
                      <span className="inline-block px-3 py-1 text-sm font-black text-sky-300 bg-sky-900/60 border border-sky-700 rounded-full uppercase tracking-widest">{PL.badgeListening}</span>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          speak(activeAudioText, 0.5, feedbackVoice);
                        }}
                        className="h-9 w-9 rounded-full border border-orange-400 bg-orange-400 text-white shadow-[0_3px_0_0_#c2410c] transition-all active:translate-y-1 flex items-center justify-center"
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
          <div className={`flex flex-col items-center w-full ${isShortViewport ? 'gap-3' : 'gap-4 sm:gap-6'}`}>
            {/* ✅ Audio control buttons in correct order */}
            <div className={`flex ${isShortViewport ? 'gap-3' : 'gap-4'}`}>
              {promptAudioText && !isListeningExercise && (item.type !== 'writing' || isDictationWriting || isSentenceWriting || isFillInBlankWriting || hasWrongAttempt) && (
                <button onClick={() => speak(activeAudioText, 1, promptVoice)} className={`${isShortViewport ? 'w-12 h-12' : 'w-14 h-14'} bg-blue-600 text-white rounded-2xl shadow-[0_4px_0_0_#1e40af] active:translate-y-1 transition-all flex items-center justify-center`} title="Play audio">
                  <img src={speakerIcon} className="w-6 h-6 brightness-0 invert" alt="Play" />
                </button>
              )}
              {promptAudioText && !isListeningExercise && (item.type !== 'writing' || isDictationWriting || isSentenceWriting || isFillInBlankWriting || hasWrongAttempt) && (
                <button onClick={() => speak(activeAudioText, 0.5, feedbackVoice)} className={`${isShortViewport ? 'w-12 h-12' : 'w-14 h-14'} bg-orange-400 text-white rounded-2xl shadow-[0_4px_0_0_#c2410c] active:translate-y-1 transition-all flex items-center justify-center`} title="Slow pronunciation">
                  <img src={turtleIcon} className="w-6 h-6 brightness-0 invert" alt="Slow" />
                </button>
              )}
              {item.type === 'speaking' && (
                <button 
                  onClick={handleSTT}
                  disabled={actionLocked || (showFooter && feedback === 'correct')}
                  className={`${isShortViewport ? 'w-12 h-12 text-xl' : 'w-14 h-14 text-2xl'} rounded-2xl active:translate-y-1 transition-all flex items-center justify-center ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_4px_0_0_#b91c1c]' : 'bg-red-500 text-white shadow-[0_4px_0_0_#991b1b] hover:bg-red-600'}`}
                  title="Tap to speak"
                >
                  <i className="fas fa-microphone"></i>
                </button>
              )}
            </div>

            {/* Shadowing: never show the target visually — the whole point is to listen */}
            {item.displayValue && !isShadowing && (
              <div className="w-full" {...selectionGestureProps}>
                {renderDisplay()}
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
                        disabled={actionLocked || wrongFooterLocked || (showFooter && feedback === 'correct')}
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
              <div className={`grid ${useCompactChoiceGrid ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-2 w-full`}>
                {shuffledOptions.map((opt) => (
                  <button
                    key={opt}
                    disabled={actionLocked || wrongFooterLocked || (showFooter && feedback === 'correct')}
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
                    className={`${isShortViewport ? 'p-2.5 min-h-[50px]' : 'p-3 min-h-[56px]'} border-2 rounded-3xl font-bold transition-all flex items-center justify-center text-center leading-snug break-words [touch-action:manipulation] ${
                      opt.length > 14 ? 'text-xs sm:text-sm normal-case' : isShortViewport ? 'text-sm font-black uppercase' : 'text-base sm:text-xl font-black uppercase'
                    } ${selectedOption === opt ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-slate-800 border-slate-600 text-white hover:border-blue-500'}`}
                  >
                    <span className="whitespace-pre-wrap">{renderInteractiveText(opt)}</span>
                  </button>
                ))}
              </div>
              )
            ) : item.type === 'speaking' ? (
              <div className="w-full flex flex-col gap-4">
                {/* Auto-growing textarea for speaking exercises - moved below buttons */}
                <textarea
                  ref={textareaRef}
                  disabled={actionLocked || wrongFooterLocked || (showFooter && feedback === 'correct')}
                  className={`w-full px-4 py-3 border-2 rounded-3xl text-center text-lg font-black focus:border-blue-500 outline-none transition-all resize-none overflow-hidden min-h-16 max-h-32 ${feedback === 'wrong' ? 'bg-slate-800 border-red-500 text-red-400' : 'bg-slate-800 border-slate-600 text-white shadow-sm'}`}
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
                  disabled={actionLocked || wrongFooterLocked || (showFooter && feedback === 'correct')}
                  className={`w-full p-4 border-2 rounded-3xl text-center text-2xl font-black focus:border-blue-500 outline-none transition-all ${feedback === 'wrong' ? 'bg-slate-800 border-red-500 text-red-400' : 'bg-slate-800 border-slate-600 text-white shadow-sm'}`}
                  value={userInput}
                  onChange={(e) => {
                    setUserInput(e.target.value);
                    if (feedback === 'wrong') { setFeedback('none'); setShowFooter(false); }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="..."
                />
              </div>
            )}
          </div>
        </div>

        <div className={`w-full shrink-0 ${isShortViewport ? 'p-3 sm:p-4' : 'p-4 sm:p-6'} flex flex-col items-center border-t-2 transition-all ${feedback === 'correct' ? 'bg-green-950 border-green-800' : feedback === 'wrong' ? 'bg-red-950 border-red-800' : 'bg-slate-900 border-slate-700'}`}>
          <div className={`w-full ${footerWidthClass}`}>
            {showFooter ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col flex-1">
                    <div className={`font-black uppercase text-lg tracking-widest animate-in slide-in-from-left-2 ${feedback === 'correct' ? 'text-yellow-400' : 'text-white'}`}>
                      {praiseText}
                    </div>
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
                  <button
                    disabled={footerActionLocked}
                      onPointerDown={(e) => {
                        if (footerActionLocked) return;
                        e.preventDefault();
                        if (feedback === 'correct') {
                          const cb = pendingOnResultRef.current;
                          if (!persistCorrectFooterAction) {
                            pendingOnResultRef.current = null;
                          }
                          cb?.();
                      } else {
                        setFeedback('none');
                        setShowFooter(false);
                      }
                    }}
                    className={`px-8 py-4 ${feedback === 'correct' ? 'bg-blue-600' : 'bg-slate-800'} text-white rounded-2xl font-black uppercase shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:translate-y-1 transition-all shrink-0 [touch-action:manipulation] disabled:opacity-40 disabled:shadow-none disabled:translate-y-0`}
                  >
                    {feedback === 'correct' ? PL.continueBtn : PL.gotItBtn}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  disabled={
                    actionLocked
                    || (!allowContinueWithoutAnswer && !(isMultipleChoice ? selectedOption : userInput.trim()))
                  }
                  onClick={() => handleCheck()}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[0_4px_0_0_#1e40af] active:translate-y-1 transition-all disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center [touch-action:manipulation]"
                >
                  {allowContinueWithoutAnswer && !(isMultipleChoice ? selectedOption : userInput.trim()) ? (
                    <span>{PL.continueBtn}</span>
                  ) : (
                    <img src={checkIcon} className="w-6 h-6 brightness-0 invert" alt="Check" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
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
