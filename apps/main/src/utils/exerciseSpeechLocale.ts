import type { Exercise } from '../types';
import { appLangToTts } from '../services/ttsService.ts';

export const DEFAULT_EXERCISE_SPEECH_LANGUAGE = 'en';

type ExerciseSpeechSource = Pick<Exercise, 'speechLanguage'> & { language?: string };

export function resolveExerciseSpeechLocale(
  exercise: ExerciseSpeechSource | null | undefined,
  workbookLanguage?: string,
  _interfaceLocale?: string,
): string {
  const explicitLanguage = exercise?.speechLanguage?.trim() || exercise?.language?.trim();
  return appLangToTts(explicitLanguage || workbookLanguage?.trim() || DEFAULT_EXERCISE_SPEECH_LANGUAGE);
}

export function describeExerciseSpeechLocale(locale: string): string {
  const language = locale.toLowerCase().split('-')[0];
  const labels: Record<string, string> = {
    en: 'English', pt: 'Português', es: 'Español', el: 'Ελληνικά', he: 'עברית',
  };
  return `${labels[language] ?? language.toUpperCase()} — ${locale}`;
}
