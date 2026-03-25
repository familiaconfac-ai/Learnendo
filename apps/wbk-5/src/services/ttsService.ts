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
// Voice resolution
// ─────────────────────────────────────────────────────────────

function pickVoice(bcp47: string): SpeechSynthesisVoice | null {
  const voices = _voices.length
    ? _voices
    : window.speechSynthesis.getVoices();

  if (!voices.length) return null;

  const exact = voices.find(v => v.lang === bcp47);
  if (exact) return exact;

  if (bcp47 === 'es-ES') {
    const esMx = voices.find(v => v.lang === 'es-MX');
    if (esMx) return esMx;
  }

  const langPrefix = bcp47.slice(0, 2);
  const partial = voices.find(v => v.lang.startsWith(langPrefix));
  if (partial) return partial;

  return voices[0];
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
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

  const voice = pickVoice(bcp47);
  if (voice) u.voice = voice;

  if (options.onEnd)   u.onend   = options.onEnd;
  if (options.onError) u.onerror = options.onError;

  window.speechSynthesis.speak(u);
}
