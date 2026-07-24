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
// Debug flag — set to false to silence all [TTS] console output
// ─────────────────────────────────────────────────────────────
const TTS_DEBUG = true;

// ─────────────────────────────────────────────────────────────
// Voice cache + initialisation
// ─────────────────────────────────────────────────────────────

let _voices: SpeechSynthesisVoice[] = [];
let _activeRemoteAudio: HTMLAudioElement | null = null;
let _activeRemoteAudioUrl: string | null = null;
let _remoteTtsAbortController: AbortController | null = null;

function cleanupRemoteAudio(): void {
  if (_activeRemoteAudio) {
    _activeRemoteAudio.pause();
    _activeRemoteAudio.src = '';
    _activeRemoteAudio = null;
  }
  if (_activeRemoteAudioUrl) {
    URL.revokeObjectURL(_activeRemoteAudioUrl);
    _activeRemoteAudioUrl = null;
  }
}

function stopRemoteAudio(): void {
  _remoteTtsAbortController?.abort();
  _remoteTtsAbortController = null;
  cleanupRemoteAudio();
}

function canUseRemoteTts(langCode: string): boolean {
  const lower = langCode.toLowerCase();
  return lower.startsWith('en') || lower.startsWith('es') || lower.startsWith('pt') || lower.startsWith('el') || lower.startsWith('he');
}

async function playRemoteTts(
  text: string,
  langCode: string,
  options: SpeakOptions,
): Promise<void> {
  stopRemoteAudio();

  const controller = new AbortController();
  _remoteTtsAbortController = controller;

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      text,
      langCode,
      rate: options.rate ?? 1,
    }),
    signal: controller.signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string'
      ? payload.error
      : `Remote TTS failed with status ${response.status}`;
    throw new Error(message);
  }

  const audioBlob = await response.blob();
  if (controller.signal.aborted) return;

  cleanupRemoteAudio();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  audio.playbackRate = options.rate ?? 1;
  audio.volume = options.volume ?? 1;
  _activeRemoteAudio = audio;
  _activeRemoteAudioUrl = audioUrl;

  audio.onended = () => {
    if (_activeRemoteAudio === audio) {
      cleanupRemoteAudio();
      _remoteTtsAbortController = null;
    }
    options.onEnd?.();
  };

  audio.onerror = () => {
    if (_activeRemoteAudio === audio) {
      cleanupRemoteAudio();
      _remoteTtsAbortController = null;
    }
    options.onError?.();
  };

  await audio.play();
}

function logVoiceList(label: string): void {
  if (!TTS_DEBUG) return;
  const voices = _voices;
  const byLang: Record<string, string[]> = {};
  voices.forEach(v => {
    const k = v.lang.slice(0, 5);
    if (!byLang[k]) byLang[k] = [];
    byLang[k].push(`${v.name} [${detectVoiceGender(v)}]`);
  });
  console.group(`[TTS] ${label} — ${voices.length} voices loaded`);
  Object.entries(byLang).sort().forEach(([lang, vs]) =>
    console.log(`  ${lang}: ${vs.join(' | ')}`)
  );
  console.groupEnd();
}

function loadVoices(): void {
  if (!('speechSynthesis' in window)) return;
  const loaded = window.speechSynthesis.getVoices();
  if (loaded.length) {
    _voices = loaded;
    // Defer log so detectVoiceGender (defined later) is available
    setTimeout(() => logVoiceList('voices loaded synchronously'), 0);
    return;
  }
  // Chrome defers voice population; the event fires once the list is ready.
  const onVoicesChanged = () => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) {
      _voices = v;
      logVoiceList('voiceschanged event');
    } else {
      // Rare: event fired but list still empty — retry once
      if (TTS_DEBUG) console.warn('[TTS] voiceschanged fired with empty list — retrying in 200ms');
      setTimeout(() => {
        _voices = window.speechSynthesis.getVoices();
        logVoiceList('voiceschanged retry');
      }, 200);
    }
  };
  window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged, { once: true });
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
    'luciana', 'monica', 'paulina', 'milena',
    'mar\u00eda',                              // es-ES Spanish female iOS/macOS
    'marisol', 'pilar', 'isabel', 'elena',
    'microsoft helena', 'microsoft zira',          // common Windows female voices
    'ting-ting', 'sin-ji', 'mei-jia',
    'google us english',              // Google's default EN voice tends to be female
    'google portugu\u00eas do brasil',
    'google espa\u00f1ol',
    'google deutsch',
    'google italiano',
    'google fran\u00e7ais',
  ];

  // Known male voice names (macOS / iOS / Windows)
  const knownMale = [
    'alex', 'daniel', 'fred', 'thomas', 'lee', 'yuri', 'luca',
    'diego', 'alejandro', 'jorge', 'carlos', 'felipe', 'juan',
    'enrique', 'miguel',                       // common ES male voice names
    'google uk english male',
    'microsoft david', 'microsoft mark',
    'microsoft pablo', 'microsoft jorge', 'microsoft raul',
  ];

  if (knownFemale.some(f => n.includes(f))) return 'female';
  if (knownMale.some(m => n.includes(m))) return 'male';

  // Additional heuristics based on voice name patterns not covered above
  // e.g. "Microsoft Helena Desktop" (es-ES female), TTS-Compact-xxx, etc.
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
 *   5. No explicit voice selection (let the browser honor `utterance.lang`)
 */
function pickVoice(bcp47: string, genderPref: 'male' | 'female' | 'any' = 'any'): SpeechSynthesisVoice | null {
  // Re-read from synthesis API in case the cache is still empty (first render race).
  const voices = _voices.length
    ? _voices
    : window.speechSynthesis.getVoices();

  if (!voices.length) {
    if (TTS_DEBUG) console.warn('[TTS] pickVoice: NO voices loaded yet — browser will use default');
    return null;
  }

  /** Helper: voices matching the locale exactly */
  const exactMatches  = voices.filter(v => v.lang === bcp47);
  /** Helper: voices for same language prefix (e.g. "pt" for "pt-BR") */
  const langPrefix    = bcp47.slice(0, 2);
  const prefixMatches = voices.filter(v => v.lang.startsWith(langPrefix));

  // Spanish: also consider es-MX when es-ES list is slim
  const spanishExtra = bcp47 === 'es-ES' ? voices.filter(v => v.lang === 'es-MX') : [];
  // Deduplicate so positional fallback (index 0 vs index 1) maps to distinct voices.
  const seen = new Set<string>();
  const candidatesByLocale = [...exactMatches, ...spanishExtra, ...prefixMatches].filter(v => {
    if (seen.has(v.name)) return false;
    seen.add(v.name);
    return true;
  });

  if (TTS_DEBUG) {
    const candidateSummary = candidatesByLocale.map(
      v => `"${v.name}" (${v.lang}, ${detectVoiceGender(v)})`
    );
    console.log(
      `[TTS] pickVoice bcp47="${bcp47}" gender="${genderPref}" — ` +
      `${voices.length} total on device, ${candidatesByLocale.length} candidate(s): ${candidateSummary.join(', ') || 'NONE'}`
    );
  }

  let selected: SpeechSynthesisVoice | null = null;
  let reason = '';

  if (genderPref !== 'any') {
    // Try to find a voice of the requested gender among locale candidates
    const gendered = candidatesByLocale.find(v => detectVoiceGender(v) === genderPref);
    if (gendered) {
      selected = gendered;
      reason = `gendered match`;
    } else if (candidatesByLocale.length >= 2) {
      // Positional fallback: different index for each gender → distinct voices even
      // when gender detection fails (avoids same voice for both in every exercise).
      selected = candidatesByLocale[genderPref === 'female' ? 0 : 1];
      reason = `positional fallback (${genderPref}=index ${genderPref === 'female' ? 0 : 1}, 2+ candidates)`;
    } else if (candidatesByLocale.length === 1) {
      selected = candidatesByLocale[0];
      reason = `only 1 candidate — NO gender alternation possible for "${bcp47}"`;
    }
  }

  if (!selected && candidatesByLocale.length) {
    selected = candidatesByLocale[0];
    reason = 'any-gender, first candidate';
  }

  if (TTS_DEBUG) {
    if (selected) {
      console.log(
        `[TTS]   -> selected: "${selected.name}" (${selected.lang}, ${detectVoiceGender(selected)}) - ${reason}`
      );
    } else {
      console.warn(
        `[TTS]   -> no compatible voice found for "${bcp47}" - leaving voice unset so the browser can honor utterance.lang`
      );
    }
  }

  return selected;
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
  if (!text) return;
  if (!('speechSynthesis' in window)) {
    options.onError?.();
    return;
  }

  stopRemoteAudio();
  window.speechSynthesis.cancel();
  // Some browsers (Chrome mobile) pause synthesis after device inactivity.
  if (window.speechSynthesis.paused) window.speechSynthesis.resume();

  const bcp47 = appLangToTts(langCode);
  const genderReq = options.voicePreference ?? 'any';
  const u = new SpeechSynthesisUtterance(text);
  u.lang = bcp47;
  u.rate   = options.rate   ?? 1;
  u.pitch  = options.pitch  ?? 1;
  u.volume = options.volume ?? 1;

  const voice = pickVoice(bcp47, genderReq);
  if (voice) u.voice = voice;

  if (TTS_DEBUG) {
    console.log(
      `[TTS] SPEAK | lang=${langCode}→${bcp47} | gender=${genderReq} | rate=${u.rate}` +
      ` | voice=${voice ? `"${voice.name}" (${voice.lang}, ${detectVoiceGender(voice)})` : 'NULL→browser default'}` +
      ` | text="${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`
    );
  }

  if (!voice && canUseRemoteTts(bcp47)) {
    if (TTS_DEBUG) {
      console.warn(`[TTS] REMOTE fallback for ${bcp47}`);
    }
    void playRemoteTts(text, bcp47, options).catch((error) => {
      if (
        (error instanceof DOMException && error.name === 'AbortError')
        || (typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'AbortError')
      ) {
        if (TTS_DEBUG) {
          console.log('[TTS] Remote fallback aborted by a newer speak call');
        }
        return;
      }
      console.warn('[TTS] Remote fallback failed, using browser default voice', error);
      if (options.onEnd) u.onend = options.onEnd;
      if (options.onError) u.onerror = options.onError;
      window.speechSynthesis.speak(u);
    });
    return;
  }

  if (options.onEnd) u.onend = options.onEnd;
  if (options.onError) u.onerror = options.onError;

  window.speechSynthesis.speak(u);
}

/**
 * Returns the deterministic prompt/feedback voice pair for a given exercise.
 *
 * Rule (1-indexed exercise numbers):
 *   odd  exercises → female prompt + male   feedback
 *   even exercises → male   prompt + female feedback
 *
 * This is stable: same index always produces the same pair, regardless of
 * re-renders, so no flicker or unexpected audio changes occur.
 *
 * Falls back gracefully if only one voice gender is available on the device —
 * pickVoice() handles that transparently.
 */
export function exerciseVoices(exerciseIdx: number): {
  prompt: 'female' | 'male';
  feedback: 'male' | 'female';
} {
  // exerciseIdx is 0-based; exercise #1 (idx 0) is "odd" → female prompt
  const promptIsFemale = exerciseIdx % 2 === 0;
  return {
    prompt:   promptIsFemale ? 'female' : 'male',
    feedback: promptIsFemale ? 'male'   : 'female',
  };
}

/**
 * Speaks a multi-line dialogue using alternating
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

// ─────────────────────────────────────────────────────────────
// Voice-readiness helpers — safe to use without touching frozen TTS logic
// ─────────────────────────────────────────────────────────────

/** Returns the number of voices currently in the cache (0 = still loading). */
export function getVoiceCount(): number {
  return _voices.length;
}

/**
 * Calls `cb` immediately if voices are already cached, otherwise defers the
 * call until the voiceschanged event fires (or at most 1.5 s, whichever comes
 * first).  Returns a cancel function so callers can prevent the deferred call
 * when the exercise unmounts before voices arrive.
 *
 * Does NOT touch pickVoice / detectVoiceGender / exerciseVoices.
 */
export function onVoicesReady(cb: () => void): () => void {
  if (_voices.length > 0) {
    cb();
    return () => {};
  }
  let alive = true;
  const guard = () => { if (alive) { alive = false; cb(); } };
  // Re-populate cache and fire when the browser has the list ready
  const handler = () => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) _voices = v;
    guard();
  };
  window.speechSynthesis.addEventListener('voiceschanged', handler, { once: true });
  // Safety net: some browsers never fire voiceschanged — call after 1.5 s.
  const t = setTimeout(() => {
    window.speechSynthesis.removeEventListener('voiceschanged', handler);
    guard();
  }, 1500);
  return () => {
    alive = false;
    clearTimeout(t);
    window.speechSynthesis.removeEventListener('voiceschanged', handler);
  };
}
