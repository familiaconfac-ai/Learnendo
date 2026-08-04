import { isSpeakingMatchAny } from './answerNormalization.ts';

export type SpeakingMode = 'shadowing' | 'repeat' | 'question-and-answer';

type SpeakingSource = {
  instruction: string;
  audioValue?: string;
  correctValue: string;
  acceptedAnswers?: string[];
  assessmentMode?: 'listening' | 'listening-writing' | 'shadowing' | 'repeat' | 'speaking';
};

export function classifySpeakingExercise(source: SpeakingSource): SpeakingMode {
  if (source.assessmentMode === 'repeat') return 'repeat';
  if (source.assessmentMode === 'shadowing') return 'shadowing';
  if (source.assessmentMode === 'speaking') return 'question-and-answer';
  const instruction = source.instruction.toLowerCase();
  if (/\b(answer|respond|reply)\b/.test(instruction) && !/\brepeat\b/.test(instruction)) return 'question-and-answer';
  if (/\b(repeat|shadow|say exactly|read aloud)\b/.test(instruction)) return 'shadowing';
  return /\?$/.test((source.audioValue ?? '').trim()) ? 'question-and-answer' : 'shadowing';
}

export function resolveAcceptedSpokenAnswers(source: SpeakingSource): string[] {
  const mode = classifySpeakingExercise(source);
  const candidates = mode === 'question-and-answer'
    ? [source.correctValue, ...(source.acceptedAnswers ?? [])]
    : [source.correctValue, source.audioValue ?? '', ...(source.acceptedAnswers ?? [])];
  const seen = new Set<string>();
  return candidates.map((value) => value.trim()).filter((value) => {
    const key = value.toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').replace(/[.!?]+$/g, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const speakingTargets = resolveAcceptedSpokenAnswers;

export function isSpeakingResponseCorrect(source: SpeakingSource, response: string, language = 'en'): boolean {
  return isSpeakingMatchAny(response, resolveAcceptedSpokenAnswers(source), language);
}
