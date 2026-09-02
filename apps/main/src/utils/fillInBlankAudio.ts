type FillInBlankSource = {
  instruction?: string;
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

export function buildBlankAudioText(prompt: string, language = 'en'): string {
  const blankWords: Record<string, string> = { en: 'blank', es: 'espacio en blanco', pt: 'em branco' };
  const blank = blankWords[language.toLowerCase().split('-')[0]] ?? '…';
  return normalizeSpacing(prompt.replace(BLANK_PLACEHOLDER_RE, blank));
}

export function buildFullSentenceFromPrompt(prompt: string, answer?: string | string[], language = 'en'): string {
  const firstAnswer = Array.isArray(answer) ? answer.find((value) => value?.trim()) : answer;
  if (!firstAnswer?.trim()) return buildBlankAudioText(prompt, language);
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

export function resolvePromptAudioText(source: FillInBlankSource, language = 'en'): string {
  const explicitTtsText = source.audioValue?.trim();
  const legacyAudioText = source.audioValueBeforeAnswer?.trim();
  const displayedText = source.displayValue?.trim();
  const instruction = source.instruction?.trim();
  const selectedText = explicitTtsText || legacyAudioText || displayedText || instruction || '';
  const prompt = hasBlankPlaceholder(selectedText)
    ? buildBlankAudioText(selectedText, language)
    : normalizeSpacing(selectedText);
  if (!/^\p{L}$/u.test(prompt)) return prompt;
  const letter = prompt.toLocaleUpperCase(language);
  switch (language.toLowerCase().split('-')[0]) {
    case 'en': return `This is the letter ${letter}.`;
    case 'es': return `Esta es la letra ${letter}.`;
    case 'pt': return `Esta é a letra ${letter}.`;
    default: return prompt;
  }
}

export function resolveFullSentenceAfterAnswer(source: FillInBlankSource, language = 'en'): string {
  if (source.fullSentenceAfterAnswer?.trim()) return normalizeSpacing(source.fullSentenceAfterAnswer);

  const answers = [source.correctValue, ...(source.acceptedAnswers ?? [])].filter((value): value is string => Boolean(value?.trim()));

  if (hasBlankPlaceholder(source.displayValue)) {
    if (source.audioValue?.trim() && !hasBlankPlaceholder(source.audioValue)) {
      return normalizeSpacing(source.audioValue);
    }
    return buildFullSentenceFromPrompt(source.displayValue!, answers, language);
  }

  if (hasBlankPlaceholder(source.audioValue)) {
    return buildFullSentenceFromPrompt(source.audioValue!, answers, language);
  }

  return normalizeSpacing(source.audioValue ?? source.displayValue ?? '');
}
