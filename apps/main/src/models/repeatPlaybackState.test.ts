import assert from 'node:assert/strict';
import test from 'node:test';
import { reduceRepeatPlayback, repeatMicAvailable } from './repeatPlaybackState.ts';

test('repeat microphone is unavailable until real playback completion', () => {
  let state = reduceRepeatPlayback('idle', 'playStarted');
  assert.equal(state, 'playingPrompt');
  assert.equal(repeatMicAvailable(state), false);
  state = reduceRepeatPlayback(state, 'playCompleted');
  assert.equal(state, 'readyToRecord');
  assert.equal(repeatMicAvailable(state), true);
});

test('error, cancellation and quick completion cannot bypass playback', () => {
  assert.equal(reduceRepeatPlayback('idle', 'playCompleted'), 'idle');
  const failed = reduceRepeatPlayback(reduceRepeatPlayback('idle', 'playStarted'), 'playFailed');
  assert.equal(failed, 'playbackError');
  assert.equal(repeatMicAvailable(failed), false);
  assert.equal(reduceRepeatPlayback(failed, 'retry'), 'idle');
});

test('item change and unmount reset completed state', () => {
  const ready = reduceRepeatPlayback(reduceRepeatPlayback('idle', 'playStarted'), 'playCompleted');
  assert.equal(reduceRepeatPlayback(ready, 'reset'), 'idle');
});
