/**
 * TTS service wrapping the Web Speech API (SpeechSynthesis).
 *
 * - Gracefully no-ops when the API is unavailable (Android WebView, older browsers)
 * - Attempts to pick a voice matching the requested gender & language
 * - Voice lists load asynchronously on some browsers; this class handles that
 */

export type TTSGender = 'male' | 'female';

export interface TTSOptions {
  gender?: TTSGender;
  /** BCP-47 language tag, e.g. "en-US", "pt-BR" */
  lang?: string;
  rate?: number;
  pitch?: number;
}

// Heuristic keyword lists for voice gender detection
const FEMALE_KEYWORDS = [
  'female', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'tessa',
  'veena', 'fiona', 'kate', 'siri', 'allison', 'ava', 'susan', 'joanna',
  'ivy', 'kendra', 'kimberly', 'salli', 'amy', 'emma', 'olivia',
];
const MALE_KEYWORDS = [
  'male', 'david', 'mark', 'alex', 'daniel', 'tom', 'fred', 'jorge',
  'diego', 'juan', 'carlos', 'brian', 'joey', 'matthew', 'liam', 'arthur',
];

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private ready = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      // Chrome fires voiceschanged; others return voices immediately
      this.synth.addEventListener('voiceschanged', () => this.loadVoices());
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    this.ready = this.voices.length > 0;
  }

  private pickVoice(lang: string, gender: TTSGender): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) this.loadVoices();

    const prefix = lang.slice(0, 2).toLowerCase();
    const candidates = this.voices.filter(
      (v) => v.lang.toLowerCase().startsWith(prefix),
    );
    if (candidates.length === 0) return null;

    const keywords = gender === 'female' ? FEMALE_KEYWORDS : MALE_KEYWORDS;
    const matched = candidates.find((v) =>
      keywords.some((k) => v.name.toLowerCase().includes(k)),
    );
    return matched ?? candidates[0];
  }

  isSupported(): boolean {
    return this.synth !== null;
  }

  speak(text: string, options: TTSOptions = {}): void {
    if (!this.synth) return;
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? 'en-US';
    utterance.rate = options.rate ?? 0.88;
    utterance.pitch = options.pitch ?? 1;

    const voice = this.pickVoice(utterance.lang, options.gender ?? 'female');
    if (voice) utterance.voice = voice;

    this.synth.speak(utterance);
  }

  stop(): void {
    this.synth?.cancel();
  }

  /** Enumerate available voices grouped by language prefix */
  listVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
}

// Singleton — shared across all components
export const tts = new TTSService();
