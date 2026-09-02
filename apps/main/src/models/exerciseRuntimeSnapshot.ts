import type { TtsPlaybackState } from '../services/ttsPlaybackLifecycle.ts';

/** Observed at the synthesis boundary, never reconstructed from exercise data. */
export interface RuntimeAudio {
  requestId: number;
  resolvedAudioText: string;
  audioLanguage: string;
  audioVoice: string | null;
  audioVoiceLanguage: string | null;
  audioProvider: 'browser-speech-synthesis' | 'google-translate';
  audioSource: 'text-to-speech';
  audioRate: number;
  state: TtsPlaybackState;
  capturedAt: string;
}

export interface ExerciseRuntimeAudio extends RuntimeAudio {
  role: 'prompt' | 'instruction' | 'option' | 'feedback';
  origin: string;
}

export function createExerciseAudioRecorder() {
  let history: ExerciseRuntimeAudio[] = [];
  let prompt: ExerciseRuntimeAudio | null = null;
  return {
    record(event: ExerciseRuntimeAudio) {
      const index = history.findIndex((entry) => entry.requestId === event.requestId);
      if (index < 0) history = [...history, { ...event }].slice(-50);
      else history[index] = { ...event };
      if (event.role === 'prompt') prompt = { ...event };
    },
    snapshot() {
      // Option pronunciation or praise must not replace the exercise prompt.
      const audio = prompt ?? history.at(-1);
      return {
        resolvedAudioText: audio?.resolvedAudioText ?? null,
        audioLanguage: audio?.audioLanguage ?? null,
        audioVoice: audio?.audioVoice ?? null,
        audioVoiceLanguage: audio?.audioVoiceLanguage ?? null,
        audioProvider: audio?.audioProvider ?? null,
        audioSource: audio?.audioSource ?? null,
        audioHistory: history.map((entry) => ({ ...entry })),
      };
    },
  };
}

export interface ExerciseRuntimeSnapshot extends ReturnType<ReturnType<typeof createExerciseAudioRecorder>['snapshot']> {
  exerciseId: string;
  renderedText: string | null;
  displayedOptions: string[];
  resolvedAcceptedAnswers: string[];
  studentAnswer: string | null;
}

export type ExerciseRuntimeReader = (() => ExerciseRuntimeSnapshot) | null;
