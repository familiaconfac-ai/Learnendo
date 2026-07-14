import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAnswerMatch,
  isSpeakingMatchAny,
  normalizeAnswer,
  normalizeStrictWritingAnswer,
} from './answerNormalization.ts';

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

test('strict writing preserves the digit-versus-word distinction', () => {
  assert.notEqual(normalizeStrictWritingAnswer('18'), normalizeStrictWritingAnswer('eighteen'));
  assert.equal(normalizeStrictWritingAnswer('Eighteen.'), normalizeStrictWritingAnswer('eighteen'));
});
