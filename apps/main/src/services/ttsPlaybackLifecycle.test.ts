import assert from 'node:assert/strict';
import test from 'node:test';
import { createTtsPlaybackSession } from './ttsPlaybackLifecycle.ts';

test('browser playback settles only after the real onend transition', async () => {
  const states: string[] = [];
  const session = createTtsPlaybackSession({ onStateChange: (state) => states.push(state) });
  session.transition('loading', 'browser');
  session.transition('playing', 'browser');
  assert.equal(session.settled, false);
  session.complete('browser');
  assert.deepEqual(await session.promise, { state: 'completed', mechanism: 'browser' });
  assert.deepEqual(states, ['loading', 'playing', 'completed']);
});

test('browser failure can remain pending while remote fallback starts', async () => {
  const session = createTtsPlaybackSession();
  session.transition('loading', 'browser');
  session.transition('loading', 'remote');
  assert.equal(session.settled, false);
  session.transition('playing', 'remote');
  session.complete('remote');
  assert.equal((await session.promise).mechanism, 'remote');
});

test('onerror and unavailable local API always settle', async () => {
  const errors: string[] = [];
  const failedVoice = createTtsPlaybackSession({ onError: (code) => errors.push(code) });
  failedVoice.transition('loading', 'browser');
  failedVoice.fail('browser-voice-unavailable', 'browser');
  assert.equal((await failedVoice.promise).state, 'error');

  const missingApi = createTtsPlaybackSession();
  missingApi.transition('loading', 'remote');
  missingApi.fail('remote-http-404', 'remote');
  assert.deepEqual(await missingApi.promise, { state: 'error', mechanism: 'remote', errorCode: 'remote-http-404' });
  assert.deepEqual(errors, ['browser-voice-unavailable']);
});

test('cancellation settles once and late events cannot overwrite it', async () => {
  const session = createTtsPlaybackSession();
  session.transition('playing', 'browser');
  session.cancel('superseded');
  session.complete('browser');
  assert.deepEqual(await session.promise, { state: 'cancelled', mechanism: 'browser', errorCode: 'superseded' });
});
