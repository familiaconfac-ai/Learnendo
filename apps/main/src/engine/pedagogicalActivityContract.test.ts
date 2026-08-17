import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAST_PEDAGOGICAL_ACTIVITY_FIELD } from './dashboardMetrics.ts';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const progressService = read('src/services/progressService.ts');
const app = read('src/App.tsx');
const liveSessionService = read('src/services/liveSessionService.ts');
const teacherService = read('src/engine/teacherService.ts');
const notifications = read('server/notifications.ts');
const technicalActivity = read('src/services/db.ts');

assert.equal(LAST_PEDAGOGICAL_ACTIVITY_FIELD, 'lastPedagogicalActivityAt');
assert.match(progressService, /\[LAST_PEDAGOGICAL_ACTIVITY_FIELD\]: serverTimestamp\(\)/,
  'normal completion and Review Mode must persist the canonical pedagogical marker');
assert.match(app, /\[LAST_PEDAGOGICAL_ACTIVITY_FIELD\]: serverTimestamp\(\)/,
  'the legacy durable completion path must persist the same marker');
assert.match(liveSessionService, /batch\.set\(doc\(db, 'progress', response\.userId\)/,
  'a durable Live answer must update the student pedagogical marker atomically');
assert.match(teacherService, /onSnapshot\(/,
  'the Dashboard must receive the new marker through its realtime subscription');
assert.match(teacherService, /progressDocs = new Map\(snap\.docs/,
  'refresh/realtime snapshots must replace stale progress data before rebuilding rows');
assert.match(notifications, /getDaysWithoutActivity\(lastActivity, now\)/,
  'notifications must use the same calendar-day calculation as the Dashboard');
assert.doesNotMatch(technicalActivity, /LAST_PEDAGOGICAL_ACTIVITY_FIELD/,
  'login/session activity must not write the pedagogical marker');

console.log('pedagogical activity contract tests passed');
