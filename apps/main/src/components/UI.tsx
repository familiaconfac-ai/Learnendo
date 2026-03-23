import React, { useState, useEffect, useRef } from 'react';
import { WORKBOOK_NUMBER } from '../constants';
import { PracticeItem, AnswerLog, UserProgress, PracticeModuleType } from '../types';
import { LESSON_CONFIGS, GRAMMAR_GUIDES, MODULE_ICONS, PRACTICE_ITEMS } from '../constants';
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

const NUMBER_MAP: Record<string, string> = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
  'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20',
  'one hundred': '100', 'one thousand': '1000'
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

const normalizeAnswer = (answer: string): string => {
  let normalized = answer.toLowerCase().trim().replace(/[.,!?;:']/g, "");

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

// Pre-processes time expressions for speaking/shadowing BEFORE punctuation stripping
const normalizeSpeakingAnswer = (answer: string): string => {
  let s = answer.toLowerCase().trim();
  // Normalize a.m./p.m. dots → am/pm before punctuation is stripped
  s = s.replace(/\ba\.m\.\b/gi, 'am').replace(/\bp\.m\.\b/gi, 'pm');
  // No-space am/pm: "7am" / "8PM" → "7 am" / "8 pm"
  s = s.replace(/\b(\d+)(am|pm)\b/gi, '$1 $2');
  // Convert word-form numbers → digits first, so "eight o'clock" → "8 o'clock" below
  Object.entries(NUMBER_MAP).forEach(([word, digit]) => {
    s = s.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
  });
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
  return normalizeAnswer(s);
};

// Returns true when a speaking/shadowing response is semantically equivalent to the target.
// Accepts AM/PM variants and o'clock as interchangeable; rejects explicit AM↔PM swaps.
const isSpeakingMatch = (response: string, target: string): boolean => {
  const normResp = normalizeSpeakingAnswer(response);
  const normTarget = normalizeSpeakingAnswer(target);
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

const shuffle = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const Header: React.FC<{ lessonId: number, progress: UserProgress }> = ({ lessonId, progress }) => {
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
  progress: UserProgress;
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

export const PracticeSection: React.FC<{ item: PracticeItem; onResult: (correct: boolean, val: string) => void; currentIdx: number; totalItems: number; lessonId: number; onBack?: () => void; }> =
  ({ item, onResult, currentIdx, totalItems, lessonId, onBack }) => {
    const [userInput, setUserInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
    const [showFooter, setShowFooter] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [praiseText, setPraiseText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
    // Tracks whether the student has had at least one wrong attempt on this item.
    // Writing exercises reveal the audio hint only after the first wrong attempt.
    const [hasWrongAttempt, setHasWrongAttempt] = useState(false);

    // Dictation exercises: audio should be visible from the start; digits rejected
    // Catches both "what you hear" and "you hear" (e.g. "Type the color you hear.")
    const isDictationWriting = item.type === 'writing' &&
      item.instruction.toLowerCase().includes('you hear');

    // Shadowing exercises: "speaking" type that is NOT a free-answer exercise
    const isShadowing = item.type === 'speaking' &&
      !item.instruction.toLowerCase().includes('listen and answer');

    // Math writing exercises that require a full English sentence answer
    const isSentenceWriting = item.type === 'writing' &&
      item.instruction.toLowerCase().includes('full sentence');

    // Refs for STT lifecycle — prevents stale callbacks from bleeding across exercises
    const recRef = useRef<any>(null);
    const currentItemIdRef = useRef<string>(item.id);
    // Stores the onResult action prepared at CHECK time so Continue never reads stale state
    const pendingOnResultRef = useRef<(() => void) | null>(null);

    useEffect(() => {
      // Cancel any ongoing STT from the previous exercise so its callbacks can't
      // write a stale transcript into the new exercise's input.
      if (recRef.current) {
        try { recRef.current.abort(); } catch (_) {}
        recRef.current = null;
      }
      currentItemIdRef.current = item.id;
      pendingOnResultRef.current = null;

      setUserInput('');
      setIsListening(false);
      setFeedback('none');
      setShowFooter(false);
      setShowHint(false);
      setSelectedOption(null);
      setHasWrongAttempt(false);

      if (item.options && item.options.length > 0) {
        setShuffledOptions(shuffle(item.options));
      } else {
        setShuffledOptions([]);
      }

      if (item.audioValue && item.type !== 'speaking' && item.type !== 'writing') {
        speak(item.audioValue);
      } else if (item.audioValue && item.type === 'speaking') {
        // ✅ Auto-play audio for speaking/shadowing exercises
        setTimeout(() => speak(item.audioValue), 500);
      } else if (item.audioValue && isDictationWriting) {
        // Dictation writing: play audio upfront so students can hear before typing
        speak(item.audioValue);
      }
      // non-dictation writing: audio is only revealed after the first wrong attempt

      setTimeout(() => {
        if (item.type === 'speaking') {
          textareaRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 200);
    }, [item.id]);  // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-grow textarea
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setUserInput(e.target.value);
      if (feedback === 'wrong') { setFeedback('none'); setShowFooter(false); }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
      }
    };

    const speak = (text: string, rate = 1) => {
      if (!text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = rate;
      window.speechSynthesis.speak(u);
    };

    const handleSTT = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return alert("Mic not supported");

      // Abort any previous recognition before starting a new one
      if (recRef.current) {
        try { recRef.current.abort(); } catch (_) {}
      }

      const capturedItemId = item.id; // capture for stale-closure guard below
      const rec = new SpeechRecognition();
      recRef.current = rec;
      rec.lang = 'en-US';
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

      rec.start();
    };

    const handleCheck = () => {
      // Dismiss keyboard immediately so the footer is at its final position
      // before the CONTINUE button renders — prevents the "double-tap" ghost click.
      inputRef.current?.blur();
      textareaRef.current?.blur();

      const rawInput = userInput || selectedOption || '';

      // Dictation writing: reject pure numeric input — student must type words
      if (isDictationWriting && /^\s*\d[\d\s]*$/.test(rawInput)) {
        setFeedback('wrong');
        setShowFooter(true);
        new Audio(ERR_SOUND).play().catch(() => {});
        setPraiseText("Type the word!");
        speak("Type the word, not a digit.");
        setHasWrongAttempt(true);
        return;
      }

      // Sentence writing (math): answer must be a complete English sentence
      if (isSentenceWriting) {
        if (/^\s*\d[\d\s]*$/.test(rawInput)) {
          setFeedback('wrong');
          setShowFooter(true);
          new Audio(ERR_SOUND).play().catch(() => {});
          setPraiseText("Use a full sentence!");
          speak("Please write a full sentence.");
          setHasWrongAttempt(true);
          return;
        }
        const normSentence = (s: string) =>
          s.trim().toLowerCase().replace(/it'?s\s/g, 'it is ').replace(/[.,!?']/g, '').trim();
        const isSentenceCorrect = normSentence(rawInput) === normSentence(item.correctValue);
        setFeedback(isSentenceCorrect ? 'correct' : 'wrong');
        setShowFooter(true);
        if (isSentenceCorrect) {
          pendingOnResultRef.current = () => onResult(true, rawInput);
          new Audio(SUCCESS_SOUND).play().catch(() => {});
          const p = ["Excellent!", "Great job!", "Perfect!", "Spot on!"][Math.floor(Math.random() * 4)];
          setPraiseText(p);
          speak(p);
        } else {
          new Audio(ERR_SOUND).play().catch(() => {});
          setPraiseText("Try again!");
          speak("No, that's not it.");
          setHasWrongAttempt(true);
        }
        return;
      }

      const response = normalizeAnswer(rawInput);
      const cleanTarget = normalizeAnswer(item.correctValue);

      const isCorrect = item.type === 'speaking'
        ? isSpeakingMatch(rawInput, item.correctValue)
        : (response === cleanTarget) ||
          (NUMBER_MAP[response] === cleanTarget) ||
          (NUMBER_MAP[cleanTarget] === response);

      setFeedback(isCorrect ? 'correct' : 'wrong');
      setShowFooter(true);

      if (isCorrect) {
        pendingOnResultRef.current = () => onResult(true, rawInput);
        new Audio(SUCCESS_SOUND).play().catch(() => { });
        const p = ["Excellent!", "Great job!", "Perfect!", "Spot on!"][Math.floor(Math.random() * 4)];
        setPraiseText(p);
        speak(p);
      } else {
        new Audio(ERR_SOUND).play().catch(() => { });
        setPraiseText("Try again!");
        speak("No, that's not it.");
        if (item.type === 'writing') setHasWrongAttempt(true);
      }
    };

    // ✅ Handle ENTER key
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (showFooter) {
          // If feedback is showing, trigger CONTINUE/GOT IT
          if (feedback === 'correct') {
            const cb = pendingOnResultRef.current;
            pendingOnResultRef.current = null;
            cb?.();
          } else {
            setFeedback('none');
            setShowFooter(false);
          }
        } else {
          // If no feedback, trigger CHECK
          if (isMultipleChoice ? selectedOption : userInput.trim()) {
            handleCheck();
          }
        }
      }
    };

    const handleOptionClick = (opt: string) => {
      if (showFooter && feedback === 'correct') return;
      setSelectedOption(opt);
      speak(opt);
      if (feedback === 'wrong') {
        setShowFooter(false);
        setFeedback('none');
        setUserInput('');
      }
    };

    const renderDisplay = () => {
      if (item.displayValue?.startsWith('fa-')) {
        const colorClass = COLOR_STYLE_MAP[item.correctValue] || 'text-blue-900';
        return (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
            <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center border-4 border-slate-100 shadow-inner">
              <i className={`fas ${item.displayValue} text-6xl ${colorClass}`}></i>
            </div>
          </div>
        );
      }

      // Check if this is reading text (contains newlines and translations)
      const isReadingText = item.displayValue && item.displayValue.includes('\n') && item.displayValue.includes('(');

      if (isReadingText) {
        return (
          <div className="w-full max-w-sm mx-auto mb-4">
            <div className="max-h-[220px] overflow-y-auto bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 shadow-inner">
              <div className={`text-lg font-bold text-center transition-colors duration-500 whitespace-pre-line ${item.isNewVocab && !showFooter ? 'text-blue-500' : 'text-slate-800'}`}>
                {item.displayValue}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className={`text-5xl font-black mb-2 select-none tracking-tighter text-center transition-colors duration-500 ${item.isNewVocab && !showFooter ? 'text-blue-500' : 'text-blue-900'}`}>
          {item.displayValue}
        </div>
      );
    };

    const translation = item.translation;
    const isMultipleChoice = item.type === 'multiple-choice' || item.type === 'identification';

    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center outline-none">
        <div className="w-full max-sm:px-4 max-w-sm px-6 pt-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${feedback === 'correct' && currentIdx === totalItems - 1 ? 100 : (currentIdx / totalItems) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="w-full max-sm:px-4 max-w-sm px-6 pt-3 pb-2">
          {/* Lesson + exercise context header */}
          <div className="flex flex-col items-center mb-3">
            <span className="text-xl font-black text-blue-900 tracking-tight leading-tight">Lesson {lessonId}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Exercise {currentIdx + 1} of {totalItems}</span>
          </div>
          <div className="relative group mb-2 cursor-help" onClick={() => setShowHint(!showHint)}>
            {item.type === 'writing' ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block px-3 py-1 text-sm font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-full uppercase tracking-widest">Writing</span>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 text-center leading-snug max-w-full break-words">
                  {item.instruction}
                </h2>
              </div>
            ) : item.type === 'speaking' && !item.instruction.toLowerCase().includes('listen and answer') ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block px-3 py-1 text-sm font-black text-green-700 bg-green-50 border border-green-200 rounded-full uppercase tracking-widest">Shadowing</span>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 text-center leading-snug max-w-full break-words">
                  {item.instruction.replace(/^(Read and repeat:|Repeat:|Say:|Pronounce correctly:|Say the result:|Say the number:)\s*/i, '')}
                </h2>
              </div>
            ) : item.type === 'speaking' ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block px-3 py-1 text-sm font-black text-orange-700 bg-orange-50 border border-orange-200 rounded-full uppercase tracking-widest">Speaking</span>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 text-center leading-snug max-w-full break-words">
                  Listen and answer
                </h2>
              </div>
            ) : (
              /* multiple-choice and identification → Listening badge */
              <div className="flex flex-col items-center gap-2">
                <span className="inline-block px-3 py-1 text-sm font-black text-sky-700 bg-sky-50 border border-sky-200 rounded-full uppercase tracking-widest">Listening</span>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 text-center leading-snug max-w-full break-words">
                  {item.instruction}
                </h2>
              </div>
            )}
            {translation && showHint && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1 font-bold">
                {translation}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 w-full max-w-sm px-6 flex flex-col items-center justify-center pb-40 overflow-y-auto">
          <div className="flex flex-col items-center gap-6 w-full">
            {/* ✅ Audio control buttons in correct order */}
            <div className="flex gap-4">
              {item.audioValue && (item.type !== 'writing' || isDictationWriting || isSentenceWriting || hasWrongAttempt) && (
                <button onClick={() => speak(item.audioValue)} className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-[0_4px_0_0_#1e40af] active:translate-y-1 transition-all flex items-center justify-center" title="Play audio">
                  <img src={speakerIcon} className="w-6 h-6 brightness-0 invert" alt="Play" />
                </button>
              )}
              {item.audioValue && (item.type !== 'writing' || isDictationWriting || isSentenceWriting || hasWrongAttempt) && (
                <button onClick={() => speak(item.audioValue, 0.5)} className="w-14 h-14 bg-orange-400 text-white rounded-2xl shadow-[0_4px_0_0_#c2410c] active:translate-y-1 transition-all flex items-center justify-center" title="Slow pronunciation">
                  <img src={turtleIcon} className="w-6 h-6 brightness-0 invert" alt="Slow" />
                </button>
              )}
              {item.type === 'speaking' && (
                <button 
                  onClick={handleSTT}
                  disabled={showFooter && feedback === 'correct'}
                  className={`w-14 h-14 rounded-2xl text-2xl active:translate-y-1 transition-all flex items-center justify-center ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_4px_0_0_#b91c1c]' : 'bg-red-500 text-white shadow-[0_4px_0_0_#991b1b] hover:bg-red-600'}`}
                  title="Tap to speak"
                >
                  <i className="fas fa-microphone"></i>
                </button>
              )}
            </div>

            {/* Shadowing: never show the target visually — the whole point is to listen */}
            {item.displayValue && !isShadowing && renderDisplay()}

            {isMultipleChoice && shuffledOptions.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 w-full">
                {shuffledOptions.map((opt) => (
                  <button
                    key={opt}
                    disabled={showFooter && feedback === 'correct'}
                    onClick={() => handleOptionClick(opt)}
                    className={`p-4 border-4 rounded-3xl font-black uppercase text-xl transition-all flex flex-col items-center gap-1 ${selectedOption === opt ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-white border-slate-100 text-slate-800 hover:border-blue-200'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : item.type === 'speaking' ? (
              <div className="w-full flex flex-col gap-4">
                {/* Auto-growing textarea for speaking exercises - moved below buttons */}
                <textarea
                  ref={textareaRef}
                  disabled={showFooter && feedback === 'correct'}
                  className={`w-full px-4 py-3 border-4 rounded-3xl text-center text-lg font-black focus:border-blue-500 outline-none bg-white transition-all resize-none overflow-hidden min-h-16 max-h-32 ${feedback === 'wrong' ? 'border-red-200 text-red-600' : 'border-slate-100 text-slate-800 shadow-sm'}`}
                  value={userInput}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Say something or type..."
                  style={{ height: 'auto' }}
                />
              </div>
            ) : (
              <div className="w-full">
                <input
                  ref={inputRef}
                  disabled={showFooter && feedback === 'correct'}
                  className={`w-full p-4 border-4 rounded-3xl text-center text-2xl font-black focus:border-blue-500 outline-none bg-white transition-all ${feedback === 'wrong' ? 'border-red-200 text-red-600' : 'border-slate-100 text-slate-800 shadow-sm'}`}
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

        <div className={`fixed bottom-0 left-0 right-0 p-6 flex flex-col items-center border-t-4 transition-all ${feedback === 'correct' ? 'bg-green-100 border-green-200' : feedback === 'wrong' ? 'bg-red-100 border-red-200' : 'bg-white border-slate-100'}`}>
          <div className="w-full max-sm:max-w-xs max-w-sm">
            {showFooter ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col flex-1">
                    <div className={`font-black uppercase text-lg tracking-widest animate-in slide-in-from-left-2 ${feedback === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                      {praiseText}
                    </div>
                    {feedback === 'wrong' && (
                      <div className="text-red-700 font-bold text-xs mt-1 animate-in fade-in">
                        The correct answer is: <span className="font-black text-sm uppercase underline decoration-2">{item.correctValue}</span>
                      </div>
                    )}
                    {feedback === 'wrong' && item.type === 'writing' && item.audioValue && hasWrongAttempt && (
                      <div className="text-blue-600 font-bold text-xs mt-1 animate-in fade-in">
                        🔊 Listen to the audio for help!
                      </div>
                    )}
                    {/* ✅ Show translation after correct answer */}
                    {feedback === 'correct' && translation && (
                      <div className="text-green-700 font-bold text-xs mt-2 animate-in fade-in italic">
                        Translation: {translation}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (feedback === 'correct') {
                        const cb = pendingOnResultRef.current;
                        pendingOnResultRef.current = null;
                        cb?.();
                      } else {
                        setFeedback('none');
                        setShowFooter(false);
                      }
                    }}
                    className={`px-8 py-4 ${feedback === 'correct' ? 'bg-blue-600' : 'bg-slate-800'} text-white rounded-2xl font-black uppercase shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:translate-y-1 transition-all shrink-0 [touch-action:manipulation]`}
                  >
                    {feedback === 'correct' ? 'CONTINUE' : 'GOT IT'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                {/* ✅ Back button with yellow color */}
                {onBack && (
                  <button
                    onClick={onBack}
                    className="flex-1 py-4 bg-yellow-500 text-white rounded-2xl font-black uppercase shadow-[0_4px_0_0_#b45309] active:translate-y-1 transition-all hover:bg-yellow-600 flex items-center justify-center"
                  >
                    <img src={backIcon} className="w-6 h-6 brightness-0 invert" alt="Back" />
                  </button>
                )}
                <button
                  disabled={isMultipleChoice ? !selectedOption : !userInput.trim()}
                  onClick={() => handleCheck()}
                  className={`${onBack ? 'flex-1' : 'w-full'} py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[0_4px_0_0_#1e40af] active:translate-y-1 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center [touch-action:manipulation]`}
                >
                  <img src={checkIcon} className="w-6 h-6 brightness-0 invert" alt="Check" />
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
          <input
            type="password"
            placeholder="Password"
            className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 font-bold text-sm focus:border-blue-500 outline-none transition-all"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
          />
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