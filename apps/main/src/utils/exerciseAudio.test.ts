import assert from 'node:assert/strict';
import test from 'node:test';
import { isDictationWritingExercise, resolveSpokenOptionText } from './exerciseAudio.ts';

test('listening-writing mode exposes audio even when the instruction is short', () => {
  for (const instruction of ['Listen and write.', 'Escute e escreva.', 'Escucha y escribe.']) {
    assert.equal(isDictationWritingExercise({
      type: 'writing',
      assessmentMode: 'listening-writing',
      instruction,
    }), true, instruction);
  }
});

test('ordinary writing does not reveal its answer audio before a wrong attempt', () => {
  assert.equal(isDictationWritingExercise({
    type: 'writing',
    instruction: 'Write the number word.',
  }), false);
});

test('uppercase YES and NO are spoken as words without changing their visual value', () => {
  assert.equal(resolveSpokenOptionText('YES'), 'Yes');
  assert.equal(resolveSpokenOptionText('NO'), 'No');
  assert.equal(resolveSpokenOptionText('A'), 'A');
});
