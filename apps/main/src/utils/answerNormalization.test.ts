import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAnswerMatch,
  isCompleteSpeakingMatchAny,
  isExactListeningWritingMatch,
  isSpeakingMatchAny,
  normalizeAnswer,
  normalizeOpenTextAnswer,
  normalizeStrictWritingAnswer,
} from './answerNormalization.ts';

test('open text normalization accepts only mechanical and contraction equivalents', () => {
  const expected = normalizeOpenTextAnswer('It is above the sink.');
  const accepted = [
    'It is above the sink.',
    'it is above the sink',
    'IT IS ABOVE THE SINK',
    "It's above the sink.",
    "it's above the sink",
    'It’s above the sink!',
    "   it's   above   the   sink   ",
  ];
  const rejected = [
    "It's about the sink.",
    "It's above the sync.",
    'It is under the sink.',
    'Above the sink.',
    'It is above sink.',
  ];

  accepted.forEach((answer) => assert.equal(normalizeOpenTextAnswer(answer), expected, answer));
  rejected.forEach((answer) => assert.notEqual(normalizeOpenTextAnswer(answer), expected, answer));
});

test('open text normalization expands supported English contractions', () => {
  const cases = [
    ["It's", 'it is'],
    ["I'm", 'i am'],
    ["you're", 'you are'],
    ["he's", 'he is'],
    ["she's", 'she is'],
    ["that's", 'that is'],
    ["there's", 'there is'],
    ["we're", 'we are'],
    ["they're", 'they are'],
    ["isn't", 'is not'],
    ["aren't", 'are not'],
    ["don't", 'do not'],
    ["doesn't", 'does not'],
    ["can't", 'cannot'],
    ["won't", 'will not'],
  ];

  cases.forEach(([contracted, expanded]) => {
    assert.equal(normalizeOpenTextAnswer(contracted), expanded, contracted);
  });
});

test('accepts the requested equivalent forms of eighteen', () => {
  for (const answer of ['18', 'eighteen', "It's 18", 'It is 18', "It's eighteen", 'It is eighteen']) {
    assert.equal(isAnswerMatch(answer, '18'), true, answer);
  }
});

test('rejects incorrect or incomplete forms', () => {
  for (const answer of ['19', 'eighty', 'It eighteen']) {
    assert.equal(isAnswerMatch(answer, '18'), false, answer);
  }
});

test('ignores capitalization, final punctuation, spacing and typographic apostrophes', () => {
  const variants = ['It is eighteen', 'it is eighteen', 'It is eighteen.', 'it is eighteen!', '  It   is   eighteen  ', 'It’s eighteen'];
  variants.forEach((answer) => assert.equal(normalizeAnswer(answer), '18', answer));
});

test('normalizes English, Portuguese and Spanish number words', () => {
  assert.equal(isAnswerMatch('eighteen', '18', 'en'), true);
  assert.equal(isAnswerMatch('É dezoito', '18', 'pt'), true);
  assert.equal(isAnswerMatch('Es dieciocho', '18', 'es'), true);
});

test('speaking accepts punctuation, capitalization and digit or word variants', () => {
  const accepted = ['Eighteen.', '18!', "It's eighteen.", 'IT IS 18'];
  accepted.forEach((answer) => assert.equal(isSpeakingMatchAny(answer, ['18'], 'en'), true, answer));
});

test("speaking and shadowing accept what's/what is and digit/word equivalence", () => {
  const targets = ['what is ten plus five'];
  for (const answer of ["What's 10 plus 5?", "What's ten plus five?", 'What is 10 plus 5?', 'whats ten plus five']) {
    assert.equal(isSpeakingMatchAny(answer, targets, 'en'), true, answer);
  }
});

test('controlled speech tolerance accepts one small transcription error but rejects semantic changes', () => {
  assert.equal(isSpeakingMatchAny('the color is ornge', ['the color is orange']), true);
  assert.equal(isSpeakingMatchAny('the color is purple', ['the color is orange']), false);
  assert.equal(isSpeakingMatchAny('what is eleven minus five', ['what is eleven plus five']), false);
});

test('strict writing preserves the digit-versus-word distinction', () => {
  assert.notEqual(normalizeStrictWritingAnswer('18'), normalizeStrictWritingAnswer('eighteen'));
  assert.equal(normalizeStrictWritingAnswer('Eighteen.'), normalizeStrictWritingAnswer('eighteen'));
});

test('exact listening-writing tolerates mechanics but preserves spoken words', () => {
  assert.equal(isExactListeningWritingMatch(' april! ', ['April']), true);
  assert.equal(isExactListeningWritingMatch('It is April.', ['April']), false);
  assert.equal(isExactListeningWritingMatch('She is in the classroom.', ["She's in the classroom."]), false);
  assert.equal(isExactListeningWritingMatch('Who is she? She is Ms. Greene.', [
    'Who is she? She is Ms. Green.',
    'Who is she? She is Ms. Greene.',
  ]), true);
  assert.equal(isExactListeningWritingMatch("Who is she? She's Ms. Green.", [
    'Who is she? She is Ms. Green.',
    'Who is she? She is Ms. Greene.',
  ]), false);
});

test('exact listening-writing rejects the eight removed semantic variants', () => {
  const removedVariants = [
    ['My birthday is January twenty-first.', 'My birthday is January 21st.'],
    ['Who is second?', 'Lucas.'],
    ['Who is second?', 'Lucas is second.'],
    ['Monday', 'What day is it today?'],
    ['January first', "What's the date?"],
    ["Are they late? No, they aren't.", 'Are they late? No, they are not.'],
    ['What day is it today? It is Monday.', 'It is Monday.'],
    ['Where are the students? They are at school.', 'They are at school.'],
  ];
  for (const [target, removed] of removedVariants) {
    assert.equal(isExactListeningWritingMatch(target, [target]), true, target);
    assert.equal(isExactListeningWritingMatch(removed, [target]), false, removed);
  }
});

test('complete speaking targets reject bare month names and other months', () => {
  const january = ['It is January.', 'The month is January.', 'January is the first month of the year.'];
  const may = ['It is May.', 'The month is May.', 'May comes after April.'];
  assert.equal(isCompleteSpeakingMatchAny('The month is January.', january), true);
  assert.equal(isCompleteSpeakingMatchAny('January is the first month of the year.', january), true);
  assert.equal(isCompleteSpeakingMatchAny('January', january), false);
  assert.equal(isCompleteSpeakingMatchAny('It is February.', january), false);
  assert.equal(isCompleteSpeakingMatchAny('The month is May.', may), true);
  assert.equal(isCompleteSpeakingMatchAny('May comes after April.', may), true);
  assert.equal(isCompleteSpeakingMatchAny('May', may), false);
  assert.equal(isCompleteSpeakingMatchAny('It is June.', may), false);
});

test('reported January date accepts only its authored word and numeric ordinal forms', () => {
  const targets = ['My birthday is January twenty-first.', 'My birthday is January 21st.'];
  const accepts = (answer: string) => targets.some((target) => isAnswerMatch(answer, target));
  for (const answer of [
    'My birthday is January twenty-first.',
    'My birthday is January twenty-first',
    'My birthday is January 21st.',
    'My birthday is January 21st',
  ]) assert.equal(accepts(answer), true, answer);
  assert.equal(accepts('My birthday is January 22nd.'), false);
});

test('letter dictation accepts the isolated letter or the complete sentence', () => {
  const targets = ['E', 'This is the letter E.'];
  const accepts = (answer: string) => targets.some((target) => isAnswerMatch(answer, target));
  assert.equal(accepts('E'), true);
  assert.equal(accepts('This is the letter E.'), true);
  assert.equal(accepts('this is the letter e'), true);
  assert.equal(accepts('this the letter e'), false);
  assert.equal(accepts('does the letter e'), false);
});
