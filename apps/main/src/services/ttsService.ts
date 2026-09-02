import { createTtsPlaybackSession, type TtsPlaybackResult, type TtsPlaybackState } from './ttsPlaybackLifecycle.ts';
import type { RuntimeAudio } from '../models/exerciseRuntimeSnapshot.ts';
import { normalizeTranslateLang } from '../utils/remoteTtsLanguage.ts';

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
const TTS_DEBUG = Boolean(import.meta.env?.DEV || import.meta.env?.VITE_DEBUG_TTS === 'true');

// ─────────────────────────────────────────────────────────────
// Voice cache + initialisation
// ─────────────────────────────────────────────────────────────

let _voices: SpeechSynthesisVoice[] = [];
let synthesisRequestId = 0;
let _activeRemoteAudio: HTMLAudioElement | null = null;
let _activeRemoteAudioUrl: string | null = null;
let _remoteTtsAbortController: AbortController | null = null;
let _activePlayback: { session: ReturnType<typeof createTtsPlaybackSession>; utterance: SpeechSynthesisUtterance | null } | null = null;

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

async function playRemoteTts(text: string, langCode: string, options: SpeakOptions, session: ReturnType<typeof createTtsPlaybackSession>, register: (audio: Omit<RuntimeAudio, 'requestId' | 'state' | 'capturedAt'>) => void): Promise<void> {
  stopRemoteAudio();
  session.transition('loading', 'remote');

  const controller = new AbortController();
  _remoteTtsAbortController = controller;
  let requestTimedOut = false;
  const requestTimeout = setTimeout(() => { requestTimedOut = true; controller.abort(); }, 10000);
  let response: Response;
  try {
    // Match the provider request exactly, including server-side whitespace/locale normalization.
    text = text.trim();
    langCode = normalizeTranslateLang(langCode);
    register({ resolvedAudioText: text, audioLanguage: langCode, audioVoice: null, audioVoiceLanguage: null,
      audioProvider: 'google-translate', audioSource: 'text-to-speech', audioRate: options.rate ?? 1 });
    response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, langCode, rate: options.rate ?? 1 }),
      signal: controller.signal,
    });
  } catch (cause) {
    if (requestTimedOut) {
      const timeout = new Error('Remote TTS request timed out') as Error & { code?: string };
      timeout.code = 'remote-timeout';
      throw timeout;
    }
    throw cause;
  } finally {
    clearTimeout(requestTimeout);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string'
      ? payload.error
      : `Remote TTS failed with status ${response.status}`;
    const error = new Error(message) as Error & { code?: string };
    error.code = `remote-http-${response.status}`;
    throw error;
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
  const playbackTimeout = setTimeout(() => {
    if (_activeRemoteAudio === audio && !session.settled) {
      cleanupRemoteAudio();
      session.fail('remote-playback-timeout', 'remote');
    }
  }, Math.max(15000, Math.min(120000, text.split(/\s+/).length * 1500)));

  audio.onplay = () => session.transition('playing', 'remote');

  audio.onended = () => {
    clearTimeout(playbackTimeout);
    if (_activeRemoteAudio === audio) {
      cleanupRemoteAudio();
      _remoteTtsAbortController = null;
    }
    session.complete('remote');
  };

  audio.onerror = () => {
    clearTimeout(playbackTimeout);
    if (_activeRemoteAudio === audio) {
      cleanupRemoteAudio();
      _remoteTtsAbortController = null;
    }
    session.fail('remote-audio-error', 'remote');
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
  /** Exact request and playback state for this call only (including remote fallback). */
  onSynthesis?: (audio: RuntimeAudio) => void;
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
  onStart?: () => void;
  onStateChange?: (state: TtsPlaybackState) => void;
  /** Called when the utterance finishes normally */
  onEnd?: () => void;
  /** Called when synthesis fails */
  onError?: (errorCode?: string) => void;
  diagnostics?: { exerciseType?: string; speechLanguage?: string };
}

export interface TtsPlaybackHandle {
  readonly promise: Promise<TtsPlaybackResult>;
  readonly state: TtsPlaybackState;
  cancel: () => void;
}

function summarizedErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code?: unknown }).code === 'string') return (error as { code: string }).code;
  if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
  if (typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'AbortError') return 'cancelled';
  return 'remote-unavailable';
}

function stopActivePlayback(reason = 'cancelled'): void {
  const active = _activePlayback;
  if (!active) return;
  active.session.cancel(reason);
  _activePlayback = null;
  stopRemoteAudio();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function cancelSpeechPlayback(): void {
  stopActivePlayback('component-unmounted');
}

/**
 * Speak `text` using the best available voice for `langCode`.
 *
 * @param text      The string to synthesise
 * @param langCode  App-level language code ('en' | 'pt' | 'es' | 'el' | 'he')
 *                  OR a full BCP-47 string ('en-US', 'pt-BR', …).  Both accepted.
 * @param options   Optional rate / pitch / volume / lifecycle callbacks
 */
export function speak(text: string, langCode = 'en', options: SpeakOptions = {}): TtsPlaybackHandle {
  stopActivePlayback('superseded');
  const bcp47 = appLangToTts(langCode);
  let synthesis: RuntimeAudio | null = null;
  const notifySynthesis = () => {
    // Diagnostics must never break playback.
    try { if (synthesis) options.onSynthesis?.({ ...synthesis }); } catch { /* non-blocking observer */ }
  };
  const registerSynthesis = (audio: Omit<RuntimeAudio, 'requestId' | 'state' | 'capturedAt'>) => {
    if (synthesis && synthesis.state !== 'completed') {
      synthesis = { ...synthesis, state: 'error' };
      notifySynthesis();
    }
    synthesis = { ...audio, requestId: ++synthesisRequestId, state: 'loading', capturedAt: new Date().toISOString() };
    notifySynthesis();
  };
  const session = createTtsPlaybackSession({
    onStateChange: (state) => {
      if (synthesis) { synthesis = { ...synthesis, state }; notifySynthesis(); }
      options.onStateChange?.(state);
      if (state === 'playing') options.onStart?.();
      if (TTS_DEBUG) console.info('[TTS lifecycle]', JSON.stringify({ type: options.diagnostics?.exerciseType ?? 'unspecified', speechLanguage: options.diagnostics?.speechLanguage ?? langCode, locale: bcp47, state }));
    },
    onEnd: options.onEnd,
    onError: options.onError,
  });
  const handle: TtsPlaybackHandle = {
    promise: session.promise,
    get state() { return session.state; },
    cancel: () => {
      if (_activePlayback?.session === session) stopActivePlayback('cancelled');
      else session.cancel('cancelled');
    },
  };
  if (!text.trim()) {
    session.fail('empty-text', 'none');
    return handle;
  }
  _activePlayback = { session, utterance: null };
  void session.promise.then((result) => {
    if (TTS_DEBUG) console.info('[TTS terminal]', JSON.stringify({ type: options.diagnostics?.exerciseType ?? 'unspecified', speechLanguage: options.diagnostics?.speechLanguage ?? langCode, locale: bcp47, mechanism: result.mechanism, errorCode: result.errorCode, state: result.state }));
    if (_activePlayback?.session === session) {
      _activePlayback = null;
      stopRemoteAudio();
    }
  });

  let browserPlaybackTimeout: ReturnType<typeof setTimeout> | null = null;
  const startRemote = () => {
    if (browserPlaybackTimeout) { clearTimeout(browserPlaybackTimeout); browserPlaybackTimeout = null; }
    if (session.settled || !canUseRemoteTts(bcp47)) {
      if (!session.settled) session.fail('browser-voice-error', 'browser');
      return;
    }
    void playRemoteTts(text, bcp47, options, session, registerSynthesis).catch((error) => {
      const code = summarizedErrorCode(error);
      if (code === 'cancelled') session.cancel('cancelled');
      else session.fail(code, 'remote');
    });
  };
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    startRemote();
    return handle;
  }

  session.transition('loading', 'browser');
  if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  const utterance = new SpeechSynthesisUtterance(text);
  if (_activePlayback?.session === session) _activePlayback.utterance = utterance;
  utterance.lang = bcp47;
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;
  const voice = pickVoice(bcp47, options.voicePreference ?? 'any');
  if (voice) utterance.voice = voice;
  utterance.onstart = () => {
    session.transition('playing', 'browser');
    browserPlaybackTimeout = setTimeout(() => {
      if (session.state !== 'playing') return;
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      window.speechSynthesis.cancel();
      startRemote();
    }, Math.max(15000, Math.min(120000, text.split(/\s+/).length * 1500)));
  };
  utterance.onend = () => session.complete('browser');
  utterance.onerror = (event) => {
    const code = event.error || 'browser-voice-error';
    if (code === 'canceled' || code === 'interrupted') session.cancel(code);
    else startRemote();
  };
  registerSynthesis({ resolvedAudioText: utterance.text, audioLanguage: utterance.lang,
    audioVoice: utterance.voice?.name ?? null, audioVoiceLanguage: utterance.voice?.lang ?? null,
    audioProvider: 'browser-speech-synthesis', audioSource: 'text-to-speech', audioRate: utterance.rate });
  window.speechSynthesis.speak(utterance);
  const browserStartTimeout = setTimeout(() => {
    if (session.state !== 'loading') return;
    utterance.onstart = null;
    utterance.onend = null;
    utterance.onerror = null;
    window.speechSynthesis.cancel();
    startRemote();
  }, 3000);
  void session.promise.then(() => {
    clearTimeout(browserStartTimeout);
    if (browserPlaybackTimeout) clearTimeout(browserPlaybackTimeout);
  });
  return handle;
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
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    cb();
    return () => {};
  }
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
