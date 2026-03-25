/**
 * ttsService.ts
 *
 * Centralized Text-to-Speech service for the Learnendo app.
 *
 * Responsibilities:
 *   - Map app language codes (en / pt / es / el / he) to BCP-47 locales
 *   - Resolve the best available browser voice for each locale
 *   - Handle the Chrome / WebKit onvoiceschanged async initialisation bug
 *   - Provide a single `speak()` entry point used by every audio call site
 *
 * Usage:
 *   import { speak, appLangToTts } from '../services/ttsService';
 *   speak('Hello!', 'en');
 *   speak('Olá!',   'pt');
 *   speak('Hola!',  'es');
 */

// ─────────────────────────────────────────────────────────────
// Language mapping
// ─────────────────────────────────────────────────────────────

/** App-level language code → preferred BCP-47 locale for TTS. */
const LANG_TO_BCP47: Record<string, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-ES',
  el: 'el-GR',
  he: 'he-IL',
};

/**
 * Convert an app-level language code ('en', 'pt', …) to its BCP-47 TTS locale.
 * Also accepts a full BCP-47 string ('en-US', 'pt-BR', …) and returns it unchanged.
 */
export function appLangToTts(lang: string | undefined): string {
  if (!lang) return 'en-US';
  if (lang.includes('-')) return lang;
  return LANG_TO_BCP47[lang] ?? 'en-US';
}

// ─────────────────────────────────────────────────────────────
// Voice cache + initialisation
// ─────────────────────────────────────────────────────────────

let _voices: SpeechSynthesisVoice[] = [];

function loadVoices(): void {
  if (!('speechSynthesis' in window)) return;
  const loaded = window.speechSynthesis.getVoices();
  if (loaded.length) {
    _voices = loaded;
    return;
  }
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    _voices = window.speechSynthesis.getVoices();
  }, { once: true });
}

if (typeof window !== 'undefined') {
  loadVoices();
}

// ─────────────────────────────────────────────────────────────
// Voice gender resolution
// ─────────────────────────────────────────────────────────────

/**
 * Heuristic gender classification based on common voice names across
 * Chrome/macOS/iOS/Android. Returns 'female', 'male', or 'unknown'.
 */
function detectVoiceGender(voice: SpeechSynthesisVoice): 'female' | 'male' | 'unknown' {
  const n = voice.name.toLowerCase();

  if (n.includes('female') || n.includes('woman') || n.includes('femenina') || n.includes('feminina')) return 'female';
  if (n.includes('male')   || n.includes('man')   || n.includes('masculino') || n.includes('masculina')) return 'male';

  const knownFemale = [
    'samantha', 'victoria', 'karen', 'tessa', 'moira', 'veena',
    'luciana', 'monica', 'paulina', 'milena',
    'mar\u00eda', 'marisol', 'pilar', 'isabel', 'elena',
    'microsoft helena', 'microsoft zira',
    'ting-ting', 'sin-ji', 'mei-jia',
    'google us english',
    'google portugu\u00eas do brasil',
    'google espa\u00f1ol',
    'google deutsch',
    'google italiano',
    'google fran\u00e7ais',
  ];

  const knownMale = [
    'alex', 'daniel', 'fred', 'thomas', 'lee', 'yuri', 'luca',
    'diego', 'alejandro', 'jorge', 'carlos', 'felipe', 'juan',
    'enrique', 'miguel',
    'google uk english male',
    'microsoft david', 'microsoft mark',
    'microsoft pablo', 'microsoft jorge', 'microsoft raul',
  ];

  if (knownFemale.some(f => n.includes(f))) return 'female';
  if (knownMale.some(m => n.includes(m))) return 'male';

  if (n.includes('helena') || n.includes('esperanza') || n.includes('conchita')) return 'female';
  if (n.includes('stefan') || n.includes('antonio') || n.includes('miguel')) return 'male';

  return 'unknown';
}

// ─────────────────────────────────────────────────────────────
// Voice resolution
// ─────────────────────────────────────────────────────────────

/**
 * Pick the best available voice for a BCP-47 locale, optionally
 * preferring a specific gender.
 *
 * Priority order:
 *   1. Exact locale match  + requested gender
 *   2. Exact locale match  (any gender)
 *   3. Same language prefix + requested gender
 *   4. Same language prefix (any gender)
 *   5. First available voice (last-resort fallback)
 */
function pickVoice(bcp47: string, genderPref: 'male' | 'female' | 'any' = 'any'): SpeechSynthesisVoice | null {
  const voices = _voices.length
    ? _voices
    : window.speechSynthesis.getVoices();

  if (!voices.length) return null;

  const exactMatches  = voices.filter(v => v.lang === bcp47);
  const langPrefix    = bcp47.slice(0, 2);
  const prefixMatches = voices.filter(v => v.lang.startsWith(langPrefix));

  // Spanish: also consider es-MX when es-ES list is slim
  const spanishExtra = bcp47 === 'es-ES' ? voices.filter(v => v.lang === 'es-MX') : [];

  // Deduplicate: exactMatches is a strict subset of prefixMatches
  const seen = new Set<string>();
  const candidatesByLocale = [...exactMatches, ...spanishExtra, ...prefixMatches].filter(v => {
    if (seen.has(v.name)) return false;
    seen.add(v.name);
    return true;
  });

  if (genderPref !== 'any') {
    const gendered = candidatesByLocale.find(v => detectVoiceGender(v) === genderPref);
    if (gendered) return gendered;
    // Positional fallback: index 0 for female, index 1 for male — ensures
    // two different voices are used even when gender detection fails.
    if (candidatesByLocale.length >= 2) {
      return candidatesByLocale[genderPref === 'female' ? 0 : 1];
    }
  }

  if (candidatesByLocale.length) return candidatesByLocale[0];
  return voices[0];
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  /**
   * Preferred voice gender when multiple voices are available for the locale.
   * Falls back gracefully if only one gender is available.
   */
  voicePreference?: 'male' | 'female';
  onEnd?: () => void;
  onError?: () => void;
}

export function speak(
  text: string,
  langCode: string = 'en',
  options: SpeakOptions = {},
): void {
  if (!text || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  if (window.speechSynthesis.paused) window.speechSynthesis.resume();

  const bcp47 = appLangToTts(langCode);
  const u = new SpeechSynthesisUtterance(text);
  u.lang   = bcp47;
  u.rate   = options.rate   ?? 1;
  u.pitch  = options.pitch  ?? 1;
  u.volume = options.volume ?? 1;

  const voice = pickVoice(bcp47, options.voicePreference ?? 'any');
  if (voice) u.voice = voice;

  if (options.onEnd)   u.onend   = options.onEnd;
  if (options.onError) u.onerror = options.onError;

  window.speechSynthesis.speak(u);
}

/**
 * Returns the deterministic prompt/feedback voice pair for a given exercise.
 *
 * Rule (0-based index):
 *   even exercises (0, 2, 4…) → female prompt + male   feedback
 *   odd  exercises (1, 3, 5…) → male   prompt + female feedback
 *
 * This is stable: same index always produces the same pair.
 * Falls back gracefully if only one voice gender is available.
 */
export function exerciseVoices(exerciseIdx: number): {
  prompt: 'female' | 'male';
  feedback: 'male' | 'female';
} {
  const promptIsFemale = exerciseIdx % 2 === 0;
  return {
    prompt:   promptIsFemale ? 'female' : 'male',
    feedback: promptIsFemale ? 'male'   : 'female',
  };
}
