import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findMatchingAlternativeIndex,
  hasDuplicateAlternatives,
  hasMatchingAlternative,
  normalizeAnswerForComparison,
} from './multipleChoiceAnswer.ts';

const acceptedPairs = [
  ['Good afternoon!', 'Good afternoon!'],
  ['Good afternoon!', 'GOOD AFTERNOON!'],
  [' Good afternoon! ', 'Good afternoon!'],
  ['Good   afternoon!', 'Good afternoon!'],
  ['Good\tafternoon!', 'Good afternoon!'],
  ['Good\nafternoon!', 'Good afternoon!'],
  ['Good\r\nafternoon!', 'Good afternoon!'],
  ['Good\u00a0afternoon!', 'Good afternoon!'],
] as const;

test('matches case, surrounding/internal whitespace, LF, CRLF and invisible spacing', () => {
  for (const [correctAnswer, alternative] of acceptedPairs) {
    assert.equal(hasMatchingAlternative([alternative], correctAnswer), true, JSON.stringify({ correctAnswer, alternative }));
  }
});

test('normalizes Unicode compatibility forms but preserves punctuation', () => {
  assert.equal(normalizeAnswerForComparison('Ｇｏｏｄ afternoon!'), 'good afternoon!');
  assert.equal(hasMatchingAlternative(['Good afternoon?'], 'Good afternoon!'), false);
});

test('rejects an answer that is genuinely absent', () => {
  assert.equal(hasMatchingAlternative(['Good night!', 'Hello!', 'Goodbye!'], 'Good afternoon!'), false);
  assert.equal(findMatchingAlternativeIndex(['A', 'B'], ''), -1);
});

test('detects duplicates after the same normalization without changing originals', () => {
  const alternatives = ['Good afternoon!', ' GOOD   AFTERNOON! ', 'Good afternoon?'];
  assert.equal(hasDuplicateAlternatives(alternatives), true);
  assert.deepEqual(alternatives, ['Good afternoon!', ' GOOD   AFTERNOON! ', 'Good afternoon?']);
});
