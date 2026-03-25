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
  // Already a full BCP-47 tag (e.g. "en-US")
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
  // Chrome defers voice population; the event fires once the list is ready.
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    _voices = window.speechSynthesis.getVoices();
  }, { once: true });
}

// Prime the cache as soon as this module is imported.
if (typeof window !== 'undefined') {
  loadVoices();
}

// ─────────────────────────────────────────────────────────────
// Voice gender resolution
// ─────────────────────────────────────────────────────────────

/**
 * Heuristic gender classification based on common voice names across
 * Chrome/macOS/iOS/Android. Returns 'female', 'male', or 'unknown'.
 *
 * This is best-effort — browsers do not expose a gender field on
 * SpeechSynthesisVoice, so we rely on well-known name substrings.
 */
function detectVoiceGender(voice: SpeechSynthesisVoice): 'female' | 'male' | 'unknown' {
  const n = voice.name.toLowerCase();

  // Explicit gender markers in the name string (Chrome, Edge)
  if (n.includes('female') || n.includes('woman') || n.includes('femenina') || n.includes('feminina')) return 'female';
  if (n.includes('male')   || n.includes('man')   || n.includes('masculino') || n.includes('masculina')) return 'male';

  // Known female voice names (macOS / iOS / Google)
  const knownFemale = [
    'samantha', 'victoria', 'karen', 'tessa', 'moira', 'veena',
    'luciana', 'monica', 'monica', 'paulina', 'milena',
    'ting-ting', 'sin-ji', 'mei-jia',
    'google us english',              // Google's default EN voice tends to be female
    'google português do brasil',
    'google español',
    'google deutsch',
    'google italiano',
    'google français',
  ];

  // Known male voice names (macOS / iOS / Windows)
  const knownMale = [
    'alex', 'daniel', 'fred', 'thomas', 'lee', 'yuri', 'luca',
    'diego', 'alejandro', 'jorge', 'carlos', 'felipe',
    'google uk english male',
    'microsoft david', 'microsoft mark', 'microsoft zira',
  ];

  if (knownFemale.some(f => n.includes(f))) return 'female';
  if (knownMale.some(m => n.includes(m))) return 'male';

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
  // Re-read from synthesis API in case the cache is still empty (first render race).
  const voices = _voices.length
    ? _voices
    : window.speechSynthesis.getVoices();

  if (!voices.length) return null;

  /** Helper: voices matching the locale exactly */
  const exactMatches  = voices.filter(v => v.lang === bcp47);
  /** Helper: voices for same language prefix (e.g. "pt" for "pt-BR") */
  const langPrefix    = bcp47.slice(0, 2);
  const prefixMatches = voices.filter(v => v.lang.startsWith(langPrefix));

  // Spanish: also consider es-MX when es-ES list is slim
  const spanishExtra = bcp47 === 'es-ES' ? voices.filter(v => v.lang === 'es-MX') : [];
  const candidatesByLocale = [...exactMatches, ...spanishExtra, ...prefixMatches];

  if (genderPref !== 'any') {
    // Try to find a voice of the requested gender among locale candidates
    const gendered = candidatesByLocale.find(v => detectVoiceGender(v) === genderPref);
    if (gendered) return gendered;
    // Fall through to any-gender candidate below
  }

  // Best locale match regardless of gender
  if (candidatesByLocale.length) return candidatesByLocale[0];

  // Last-resort fallback: first available voice
  return voices[0];
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export interface SpeakOptions {
  /** Playback rate — 0.1 to 10, default 1 */
  rate?: number;
  /** Pitch — 0 to 2, default 1 */
  pitch?: number;
  /** Volume — 0 to 1, default 1 */
  volume?: number;
  /**
   * Preferred voice gender when multiple voices are available for the locale.
   * Falls back gracefully if only one gender is available.
   */
  voicePreference?: 'male' | 'female';
  /** Called when the utterance finishes normally */
  onEnd?: () => void;
  /** Called when synthesis fails */
  onError?: () => void;
}

/**
 * Speak `text` using the best available voice for `langCode`.
 *
 * @param text      The string to synthesise
 * @param langCode  App-level language code ('en' | 'pt' | 'es' | 'el' | 'he')
 *                  OR a full BCP-47 string ('en-US', 'pt-BR', …).  Both accepted.
 * @param options   Optional rate / pitch / volume / lifecycle callbacks
 */
export function speak(
  text: string,
  langCode: string = 'en',
  options: SpeakOptions = {},
): void {
  if (!text || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  // Some browsers (Chrome mobile) pause synthesis after device inactivity.
  if (window.speechSynthesis.paused) window.speechSynthesis.resume();

  const bcp47 = appLangToTts(langCode);
  const u = new SpeechSynthesisUtterance(text);
  u.lang = bcp47;
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
 * Convenience helper that plays a dialogue exchange using two different
 * voices when possible (one male, one female).  Each entry is an object
 * with `text` and optional `gender` ('male' | 'female').
 *
 * Falls back gracefully if only one voice is available for the locale.
 */
export function speakDialogue(
  lines: Array<{ text: string; gender?: 'male' | 'female' }>,
  langCode: string = 'en',
  options: Omit<SpeakOptions, 'voicePreference' | 'onEnd' | 'onError'> = {},
): void {
  if (!lines.length || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const bcp47 = appLangToTts(langCode);
  const voices = _voices.length ? _voices : window.speechSynthesis.getVoices();

  // Resolve a distinct voice per requested gender so dialogue alternates.
  const voiceFor = (gender?: 'male' | 'female'): SpeechSynthesisVoice | null =>
    pickVoice(bcp47, gender ?? 'any');

  // Queue all utterances without inter-utterance gap
  lines.forEach((line, i) => {
    const u = new SpeechSynthesisUtterance(line.text);
    u.lang   = bcp47;
    u.rate   = options.rate   ?? 1;
    u.pitch  = options.pitch  ?? 1;
    u.volume = options.volume ?? 1;
    const voice = voiceFor(line.gender);
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
    void voices; // suppress unused warning
    void i;
  });
}
