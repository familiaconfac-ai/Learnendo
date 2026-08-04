import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePromptAudioText } from './fillInBlankAudio.ts';

test('explicit TTS text wins over underscores in the displayed text', () => {
  assert.equal(resolvePromptAudioText({
    instruction: 'Choose the article.',
    displayValue: 'It is __ kite.',
    audioValue: 'What is it?',
    audioValueBeforeAnswer: 'Legacy prompt.',
  }), 'What is it?');
});

test('explicit TTS text wins over every supported visual blank marker', () => {
  for (const displayValue of [
    'It is __ kite.',
    'It is ___ kite.',
    'It is [blank] kite.',
    'It is (blank) kite.',
    'It is {blank} kite.',
    'It is blank kite.',
  ]) {
    assert.equal(resolvePromptAudioText({ displayValue, audioValue: '  What is it?  ' }), 'What is it?', displayValue);
  }
});

test('legacy prompt is used only when explicit TTS text is empty', () => {
  assert.equal(resolvePromptAudioText({
    displayValue: 'It is __ kite.', audioValue: '   ', audioValueBeforeAnswer: 'Legacy question?',
  }), 'Legacy question?');
});

test('displayed blank text is converted only as a fallback', () => {
  assert.equal(resolvePromptAudioText({ displayValue: 'It is __ kite.', audioValue: '' }), 'It is blank kite.');
});

test('instruction is the last fallback and empty sources stay silent', () => {
  assert.equal(resolvePromptAudioText({ instruction: 'Listen and choose.' }), 'Listen and choose.');
  assert.equal(resolvePromptAudioText({}), '');
});

test('blank markers in explicit TTS text remain speakable without consulting display text', () => {
  assert.equal(resolvePromptAudioText({
    displayValue: 'Unrelated visual text.', audioValue: 'Complete the ___ sentence.',
  }), 'Complete the blank sentence.');
});
