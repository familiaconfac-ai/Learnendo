import { isSpeakingMatchAny, normalizeSpeakingAnswer } from './answerNormalization.ts';

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

const TEMPLATE_MARKERS = {
  name: 'learnendonameslot',
  age: 'learnendoageslot',
  place: 'learnendoplaceslot',
} as const;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function isSpeakingTemplateMatch(response: string, target: string, language = 'en'): boolean {
  if (!/\{(?:name|age|place)\}/i.test(target)) return false;
  const markedTarget = target.replace(/\{(name|age|place)\}/gi, (_match, slot: keyof typeof TEMPLATE_MARKERS) => TEMPLATE_MARKERS[slot.toLowerCase() as keyof typeof TEMPLATE_MARKERS]);
  let pattern = escapeRegExp(normalizeSpeakingAnswer(markedTarget, language));
  pattern = pattern
    .replace(TEMPLATE_MARKERS.name, '(?!(?:from|years?)(?: |$))[a-z0-9]+(?: [a-z0-9]+){0,3}')
    .replace(TEMPLATE_MARKERS.age, '\\d{1,3}')
    .replace(TEMPLATE_MARKERS.place, '[a-z0-9]+(?: [a-z0-9]+){0,4}');
  return new RegExp(`^${pattern}$`, 'i').test(normalizeSpeakingAnswer(response, language));
}

export const isSpeakingTemplateMatchAny = (
  response: string,
  targets: string[],
  language = 'en',
): boolean => targets.some((target) => isSpeakingTemplateMatch(response, target, language));

export function isSpeakingResponseCorrect(source: SpeakingSource, response: string, language = 'en'): boolean {
  const targets = resolveAcceptedSpokenAnswers(source);
  return isSpeakingMatchAny(response, targets, language)
    || isSpeakingTemplateMatchAny(response, targets, language);
}
