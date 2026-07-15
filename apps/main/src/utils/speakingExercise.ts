import { isSpeakingMatchAny } from './answerNormalization.ts';

export type SpeakingMode = 'shadowing' | 'question-and-answer';

type SpeakingSource = {
  instruction: string;
  audioValue?: string;
  correctValue: string;
  acceptedAnswers?: string[];
  assessmentMode?: 'listening-writing' | 'shadowing' | 'speaking';
};

export function classifySpeakingExercise(source: SpeakingSource): SpeakingMode {
  if (source.assessmentMode === 'shadowing') return 'shadowing';
  if (source.assessmentMode === 'speaking') return 'question-and-answer';
  const instruction = source.instruction.toLowerCase();
  if (/\b(answer|respond|reply)\b/.test(instruction) && !/\brepeat\b/.test(instruction)) return 'question-and-answer';
  if (/\b(repeat|shadow|say exactly|read aloud)\b/.test(instruction)) return 'shadowing';
  return /\?$/.test((source.audioValue ?? '').trim()) ? 'question-and-answer' : 'shadowing';
}

export function speakingTargets(source: SpeakingSource): string[] {
  if (classifySpeakingExercise(source) === 'shadowing') {
    return [(source.audioValue ?? source.correctValue).trim()].filter(Boolean);
  }
  return [source.correctValue, ...(source.acceptedAnswers ?? [])].filter((value) => value.trim());
}

export function isSpeakingResponseCorrect(source: SpeakingSource, response: string, language = 'en'): boolean {
  return isSpeakingMatchAny(response, speakingTargets(source), language);
}
