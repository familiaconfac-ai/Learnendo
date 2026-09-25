import assert from 'node:assert/strict';
import {
  LIVE_MEDIA_GRACE_PERIOD_MS,
  hasGracePeriodExpired,
  isLiveMediaActive,
  normalizeMediaTransport,
  shouldConnectForTransport,
} from './liveMediaPolicy.ts';

assert.equal(LIVE_MEDIA_GRACE_PERIOD_MS, 10_000);
assert.equal(isLiveMediaActive({}), false);
assert.equal(isLiveMediaActive({ teacherLiveMicEnabled: true }), true);
assert.equal(isLiveMediaActive({ teacherCameraEnabled: true }), true);
assert.equal(isLiveMediaActive({ teacherScreenShareEnabled: true }), true);
assert.equal(isLiveMediaActive({ anyStudentMediaActive: true }), true);
assert.equal(shouldConnectForTransport('none'), false);
assert.equal(shouldConnectForTransport('meet'), false);
assert.equal(shouldConnectForTransport('livekit-connecting'), true);
assert.equal(shouldConnectForTransport('livekit-active'), true);
assert.equal(normalizeMediaTransport('not-configured'), 'none');
assert.equal(normalizeMediaTransport('connecting'), 'livekit-connecting');
assert.equal(normalizeMediaTransport('connected'), 'livekit-active');
assert.equal(hasGracePeriodExpired(new Date(1_000).toISOString(), 10_999), false);
assert.equal(hasGracePeriodExpired(new Date(1_000).toISOString(), 11_000), true);

console.log('liveMediaPolicy tests passed');
