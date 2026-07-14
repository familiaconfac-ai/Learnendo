type FillInBlankSource = {
  displayValue?: string;
  audioValue?: string;
  audioValueBeforeAnswer?: string;
  fullSentenceAfterAnswer?: string;
  correctValue?: string;
  acceptedAnswers?: string[];
};

const BLANK_PLACEHOLDER_RE = /_{2,}|\[\s*blank\s*\]|\(\s*blank\s*\)|\{\s*blank\s*\}|\bblank\b/gi;
const BLANK_PLACEHOLDER_TEST_RE = /_{2,}|\[\s*blank\s*\]|\(\s*blank\s*\)|\{\s*blank\s*\}|\bblank\b/i;

function normalizeSpacing(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function hasBlankPlaceholder(text?: string): boolean {
  if (!text) return false;
  return BLANK_PLACEHOLDER_TEST_RE.test(text);
}

export function buildBlankAudioText(prompt: string): string {
  return normalizeSpacing(prompt.replace(BLANK_PLACEHOLDER_RE, 'blank'));
}

export function buildFullSentenceFromPrompt(prompt: string, answer?: string | string[]): string {
  const firstAnswer = Array.isArray(answer) ? answer.find((value) => value?.trim()) : answer;
  if (!firstAnswer?.trim()) return buildBlankAudioText(prompt);
  return normalizeSpacing(prompt.replace(BLANK_PLACEHOLDER_RE, firstAnswer.trim()));
}

export function isFillInBlankExercise(source: FillInBlankSource): boolean {
  return Boolean(
    source.audioValueBeforeAnswer
    || source.fullSentenceAfterAnswer
    || hasBlankPlaceholder(source.displayValue)
    || hasBlankPlaceholder(source.audioValue),
  );
}

export function resolvePromptAudioText(source: FillInBlankSource): string {
  let prompt = '';
  if (source.audioValueBeforeAnswer?.trim()) prompt = normalizeSpacing(source.audioValueBeforeAnswer);
  else if (hasBlankPlaceholder(source.displayValue)) prompt = buildBlankAudioText(source.displayValue!);
  else if (hasBlankPlaceholder(source.audioValue)) prompt = buildBlankAudioText(source.audioValue!);
  else prompt = normalizeSpacing(source.audioValue ?? source.displayValue ?? '');
  return /^h$/i.test(prompt) ? 'the letter H' : prompt;
}

export function resolveFullSentenceAfterAnswer(source: FillInBlankSource): string {
  if (source.fullSentenceAfterAnswer?.trim()) return normalizeSpacing(source.fullSentenceAfterAnswer);

  const answers = [source.correctValue, ...(source.acceptedAnswers ?? [])].filter((value): value is string => Boolean(value?.trim()));

  if (hasBlankPlaceholder(source.displayValue)) {
    if (source.audioValue?.trim() && !hasBlankPlaceholder(source.audioValue)) {
      return normalizeSpacing(source.audioValue);
    }
    return buildFullSentenceFromPrompt(source.displayValue!, answers);
  }

  if (hasBlankPlaceholder(source.audioValue)) {
    return buildFullSentenceFromPrompt(source.audioValue!, answers);
  }

  return normalizeSpacing(source.audioValue ?? source.displayValue ?? '');
}
