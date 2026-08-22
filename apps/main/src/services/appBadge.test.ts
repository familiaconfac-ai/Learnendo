import assert from 'node:assert/strict';
import {
  applyNotificationAppBadge,
  applyPedagogicalAppBadge,
  clearPedagogicalAppBadge,
  normalizePedagogicalBadgeCount,
  type AppBadgeStateStore,
  type AppBadgeTarget,
} from './appBadge';

function badgeHarness(initial: number) {
  let current = initial;
  let stored = initial;
  const target: AppBadgeTarget = {
    async setAppBadge(value = 0) { current = value; },
    async clearAppBadge() { current = 0; },
  };
  const store: AppBadgeStateStore = {
    async read() { return stored; },
    async write(value) { stored = value; },
  };
  return { target, store, current: () => current };
}

// The server sends the authoritative inactivity count with every push. An
// administrative test reapplies it instead of incrementing notification history.
for (const current of [0, 1]) {
  const badge = badgeHarness(current);
  await applyNotificationAppBadge('ADMIN_TEST', 99, badge.target, badge.store);
  assert.equal(badge.current(), current, `test push must preserve badge ${current}`);
}

const inactive = badgeHarness(0);
await applyPedagogicalAppBadge(2, inactive.target, inactive.store);
assert.equal(inactive.current(), 2, 'two inactive calendar days must show badge 2');

await applyPedagogicalAppBadge(0, inactive.target, inactive.store);
assert.equal(inactive.current(), 0, 'valid learning activity must clear the badge');

await applyPedagogicalAppBadge(3, inactive.target, inactive.store);
await clearPedagogicalAppBadge(inactive.target, inactive.store);
assert.equal(inactive.current(), 0, 'the activity cleanup entry point must clear the inactivity badge');

await applyPedagogicalAppBadge(1, inactive.target, inactive.store);
assert.equal(inactive.current(), 1, 'inactivity after studying must restart at 1');

assert.equal(normalizePedagogicalBadgeCount('2'), 2);
assert.equal(normalizePedagogicalBadgeCount('invalid'), 0);

console.log('app badge tests passed');
