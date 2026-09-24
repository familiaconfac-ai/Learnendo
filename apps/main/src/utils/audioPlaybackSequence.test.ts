import assert from 'node:assert/strict';
import test from 'node:test';
import { runAfterAudioPlayback } from './audioPlaybackSequence.ts';

test('feedback waits until the selected-option audio settles', async () => {
  let finishOption!: () => void;
  const events: string[] = [];
  const playback = { promise: new Promise<void>((resolve) => { finishOption = resolve; }) };

  const queued = runAfterAudioPlayback(playback, () => events.push('feedback'));
  events.push('option-playing');
  assert.deepEqual(events, ['option-playing']);

  finishOption();
  await queued;
  assert.deepEqual(events, ['option-playing', 'feedback']);
});

test('stale exercise feedback is skipped after the option audio settles', async () => {
  let current = true;
  let finishOption!: () => void;
  const events: string[] = [];
  const playback = { promise: new Promise<void>((resolve) => { finishOption = resolve; }) };

  const queued = runAfterAudioPlayback(playback, () => events.push('feedback'), () => current);
  current = false;
  finishOption();
  await queued;

  assert.deepEqual(events, []);
});
