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
// Voice resolution
// ─────────────────────────────────────────────────────────────

/**
 * Pick the best available voice for a BCP-47 locale.
 *
 * Priority order:
 *   1. Exact match              — e.g. "pt-BR"
 *   2. Same language, any region — e.g. "pt-PT" when "pt-BR" is unavailable
 *   3. First available voice    — last-resort fallback
 */
function pickVoice(bcp47: string): SpeechSynthesisVoice | null {
  // Re-read from synthesis API in case the cache is still empty (first render race).
  const voices = _voices.length
    ? _voices
    : window.speechSynthesis.getVoices();

  if (!voices.length) return null;

  // Exact match
  const exact = voices.find(v => v.lang === bcp47);
  if (exact) return exact;

  // Spanish: prefer es-MX when es-ES is unavailable (common on macOS/iOS)
  if (bcp47 === 'es-ES') {
    const esMx = voices.find(v => v.lang === 'es-MX');
    if (esMx) return esMx;
  }

  // Same language prefix (first two chars)
  const langPrefix = bcp47.slice(0, 2);
  const partial = voices.find(v => v.lang.startsWith(langPrefix));
  if (partial) return partial;

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

  const voice = pickVoice(bcp47);
  if (voice) u.voice = voice;

  if (options.onEnd)   u.onend   = options.onEnd;
  if (options.onError) u.onerror = options.onError;

  window.speechSynthesis.speak(u);
}
