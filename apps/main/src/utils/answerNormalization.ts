export type AnswerLanguage = 'en' | 'pt' | 'es' | string;

interface NormalizeAnswerOptions {
  stripPrefixes?: boolean;
  language?: AnswerLanguage;
}

const EN_NUMBER_MAP: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
  'one hundred': '100', 'one thousand': '1000',
};

const PT_NUMBER_MAP: Record<string, string> = {
  zero: '0', um: '1', uma: '1', dois: '2', duas: '2', tres: '3', quatro: '4', cinco: '5', seis: '6', sete: '7', oito: '8', nove: '9', dez: '10',
  onze: '11', doze: '12', treze: '13', quatorze: '14', quinze: '15', dezesseis: '16', dezessete: '17', dezoito: '18', dezenove: '19', vinte: '20',
};

const ES_NUMBER_MAP: Record<string, string> = {
  cero: '0', uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10',
  once: '11', doce: '12', trece: '13', catorce: '14', quince: '15', dieciseis: '16', diecisiete: '17', dieciocho: '18', diecinueve: '19', veinte: '20',
};

const TIME_NORMALIZE_MAP: Record<string, string> = {
  '7:00': 'seven o clock', '7 o clock': 'seven o clock', 'seven oclock': 'seven o clock', '7 oclock': 'seven o clock',
  '7:30': 'seven thirty', '7 thirty': 'seven thirty', 'seven 30': 'seven thirty',
  '8:00': 'eight o clock', '8 o clock': 'eight o clock', 'eight oclock': 'eight o clock', '8 oclock': 'eight o clock',
  '9:00': 'nine o clock', '9 o clock': 'nine o clock', 'nine oclock': 'nine o clock', '9 oclock': 'nine o clock',
  '12:00': 'twelve o clock', '12 o clock': 'twelve o clock', 'twelve oclock': 'twelve o clock', '12 oclock': 'twelve o clock',
  '6:30': 'six thirty', '6 thirty': 'six thirty', 'six 30': 'six thirty',
  '5:00': 'five o clock', '5 o clock': 'five o clock', 'five oclock': 'five o clock', '5 oclock': 'five o clock',
  '3:00': 'three o clock', '3 o clock': 'three o clock', 'three oclock': 'three o clock', '3 oclock': 'three o clock',
};

export const stripDiacritics = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const expandCommonContractions = (value: string): string => value
  .replace(/\bdoesn't\b/gi, 'does not')
  .replace(/\bdon't\b/gi, 'do not')
  .replace(/\bdidn't\b/gi, 'did not')
  .replace(/\bisn't\b/gi, 'is not')
  .replace(/\baren't\b/gi, 'are not')
  .replace(/\bwasn't\b/gi, 'was not')
  .replace(/\bweren't\b/gi, 'were not')
  .replace(/\bcan't\b/gi, 'can not')
  .replace(/\bcannot\b/gi, 'can not')
  .replace(/\bwon't\b/gi, 'will not')
  .replace(/\bit['\u2019]s\b/gi, 'it is');

function replaceNumberWords(value: string, map: Record<string, string>): string {
  return Object.entries(map).reduce(
    (result, [word, digit]) => result.replace(new RegExp(`\\b${word}\\b`, 'g'), digit),
    value,
  );
}

function normalizeMathOperators(value: string, language?: AnswerLanguage): string {
  let normalized = value;
  if (language === 'pt') {
    normalized = normalized
      .replace(/\s*\+\s*/g, ' mais ')
      .replace(/\s*[\*\u00d7]\s*/g, ' vezes ')
      .replace(/\s*\u00f7\s*/g, ' dividido por ');
  } else if (language === 'es') {
    normalized = normalized
      .replace(/\s*\+\s*/g, ' mas ')
      .replace(/\s*[\*\u00d7]\s*/g, ' por ')
      .replace(/\s*\u00f7\s*/g, ' entre ');
  } else {
    normalized = normalized
      .replace(/\s*\+\s*/g, ' plus ')
      .replace(/\s*[\*\u00d7]\s*/g, ' times ')
      .replace(/\s*\u00f7\s*/g, ' divided by ');
  }
  return normalized
    .replace(/(\d)\s*\/\s*(\d)/g, '$1 divided by $2')
    .replace(/\b([a-z0-9]+)\s+[xX]\s+([a-z0-9]+)\b/g, '$1 times $2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeAnswer(answer: string, options: NormalizeAnswerOptions = {}): string {
  const { stripPrefixes = true, language = 'en' } = options;
  let normalized = stripDiacritics(expandCommonContractions(answer))
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u02bc\u2032]/g, "'")
    .replace(/[.,!?;:'\u00bf\u00a1]/g, '')
    .replace(/\s+/g, ' ');

  if (stripPrefixes) {
    normalized = normalized.replace(/^(it is |its |the answer is |the result is |the number is )/, '');
    if (language === 'pt') normalized = normalized.replace(/^e\s+/, '');
    if (language === 'es') normalized = normalized.replace(/^es\s+/, '');
  }

  normalized = replaceNumberWords(normalized, EN_NUMBER_MAP);
  if (language === 'pt') normalized = replaceNumberWords(normalized, PT_NUMBER_MAP);
  if (language === 'es') normalized = replaceNumberWords(normalized, ES_NUMBER_MAP);

  normalized = Object.entries(TIME_NORMALIZE_MAP).reduce(
    (result, [time, replacement]) => result.replace(
      new RegExp(time.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      replacement,
    ),
    normalized,
  );

  normalized = normalized
    .replace(/\b(\d+):(\d+)\b/g, (_match, hour: string, minute: string) =>
      minute === '00' ? `${hour} o clock` : `${hour} ${minute}`)
    .replace(/\b(\d+)\s*o'?clock\b/g, '$1 o clock')
    .replace(/\b(\d+)\s*thirty\b/g, '$1 thirty');

  return normalizeMathOperators(normalized, language);
}

export const normalizeSentenceAnswer = (answer: string, language: AnswerLanguage = 'en'): string =>
  normalizeAnswer(answer, { stripPrefixes: false, language });

export function normalizeStrictWritingAnswer(answer: string): string {
  return stripDiacritics(expandCommonContractions(answer))
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u02bc\u2032]/g, "'")
    .replace(/[.,!?;:\u00bf\u00a1]+$/g, '')
    .replace(/\s+/g, ' ');
}

export function isAnswerMatch(
  response: string,
  target: string,
  language: AnswerLanguage = 'en',
): boolean {
  return normalizeAnswer(response, { language }) === normalizeAnswer(target, { language });
}

export function normalizeSpeakingAnswer(answer: string, language: AnswerLanguage = 'en'): string {
  let normalized = stripDiacritics(expandCommonContractions(answer))
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u02bc\u2032]/g, "'")
    .replace(/\ba\.m\.\b/g, 'am')
    .replace(/\bp\.m\.\b/g, 'pm')
    .replace(/\b(\d+)(am|pm)\b/g, '$1 $2');

  normalized = replaceNumberWords(normalized, EN_NUMBER_MAP);
  if (language === 'pt') normalized = replaceNumberWords(normalized, PT_NUMBER_MAP).replace(/^e\s+/, '');
  if (language === 'es') normalized = replaceNumberWords(normalized, ES_NUMBER_MAP).replace(/^es\s+/, '');

  normalized = normalized
    .replace(/\b(\d+):00\s*(am|pm)\b/g, '$1 $2')
    .replace(/\b(\d+):30\s*(am|pm)\b/g, '$1 thirty $2')
    .replace(/\b(\d+):(\d+)\s*(am|pm)\b/g, '$1 $2 $3')
    .replace(/\b(\d+):30\b/g, '$1 thirty')
    .replace(/\b(\d+):00\b/g, '$1')
    .replace(/\b(\d+):(\d+)\b/g, '$1 $2')
    .replace(/\b(\d+)\s+30\b/g, '$1 thirty')
    .replace(/\b(\d+)\s*o(?:'|\s)?clock\b/g, '$1');

  return normalizeAnswer(normalized, { language });
}

export function isSpeakingMatch(
  response: string,
  target: string,
  language: AnswerLanguage = 'en',
): boolean {
  const normalizedResponse = normalizeSpeakingAnswer(response, language);
  const normalizedTarget = normalizeSpeakingAnswer(target, language);
  if (normalizedResponse === normalizedTarget) return true;

  const hasAm = (value: string): boolean => /\b\d+\s+am\b/.test(value);
  const hasPm = (value: string): boolean => /\b\d+\s+pm\b/.test(value);
  if (hasAm(normalizedTarget) && hasPm(normalizedResponse)) return false;
  if (hasPm(normalizedTarget) && hasAm(normalizedResponse)) return false;

  const stripAmPm = (value: string): string =>
    value.replace(/\s+(?:am|pm)\b/g, '').replace(/\s+/g, ' ').trim();
  return stripAmPm(normalizedResponse) === stripAmPm(normalizedTarget);
}

export const isSpeakingMatchAny = (
  response: string,
  targets: string[],
  language: AnswerLanguage = 'en',
): boolean => targets.some((target) => isSpeakingMatch(response, target, language));
