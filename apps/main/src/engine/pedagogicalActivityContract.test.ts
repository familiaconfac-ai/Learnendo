import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAST_PEDAGOGICAL_ACTIVITY_FIELD } from './dashboardMetrics.ts';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const progressService = read('src/services/progressService.ts');
const app = read('src/App.tsx');
const exercisePractice = read('src/components/ExercisePractice/ExercisePractice.tsx');
const liveSessionService = read('src/services/liveSessionService.ts');
const liveAttendanceService = read('src/services/liveAttendanceService.ts');
const liveClassRoom = read('src/components/LiveClasses/LiveClassRoomPage.tsx');
const teacherService = read('src/engine/teacherService.ts');
const notifications = read('server/notifications.ts');
const technicalActivity = read('src/services/db.ts');

assert.equal(LAST_PEDAGOGICAL_ACTIVITY_FIELD, 'lastPedagogicalActivityAt');
assert.match(progressService, /\[LAST_PEDAGOGICAL_ACTIVITY_FIELD\]: serverTimestamp\(\)/,
  'normal completion and Review Mode must persist the canonical pedagogical marker');
assert.match(progressService, /recordNormalLessonPedagogicalActivity[\s\S]*?await setDoc\(doc\(db, 'progress', userId\),[\s\S]*?\[LAST_PEDAGOGICAL_ACTIVITY_FIELD\]: serverTimestamp\(\)/,
  'normal completion must have a direct durable write for the canonical marker');
assert.match(app, /await recordNormalLessonPedagogicalActivity\(user\.uid\)/,
  'handleDayComplete must await the direct canonical marker write');
assert.match(app, /\[LAST_PEDAGOGICAL_ACTIVITY_FIELD\]: serverTimestamp\(\)/,
  'the legacy durable completion path must persist the same marker');
assert.match(exercisePractice, /practiceCompletionPersistence\(isReplay\)/,
  'normal completion and replay must share the activity persistence policy');
assert.match(exercisePractice, /onActivityComplete\?\.\(day\.id, masterySummary\.finalMastery, analytics\)/,
  'all exercise and Review Mode variants must record activity after mastery completion');
assert.doesNotMatch(liveSessionService, /LAST_PEDAGOGICAL_ACTIVITY_FIELD|lastPedagogicalActivityAt/,
  'Live Class exercises must never change the autonomous pedagogical marker');
assert.match(liveSessionService, /recordLiveAttendanceExercise\(/,
  'Live Class exercises and verdicts must be saved to their own attendance history');
assert.match(liveAttendanceService, /attendanceSessions:\s*\{\s*\[sessionId\]/,
  'online sessions must be durably stored in each student own existing presence document');
assert.match(liveClassRoom, /startLiveAttendance\(liveClass, user\.uid\)/,
  'entering a Live Class must open an independent attendance session');
assert.match(liveClassRoom, /finishLiveAttendance\(liveClass\.id, user\.uid\)/,
  'leaving a Live Class must close the independent attendance session');
assert.match(teacherService, /lastActivity:\s*getLastPedagogicalActivity\(progressData\)/,
  'Active must be derived solely from autonomous progress activity');
assert.match(teacherService, /liveAttendance:\s*liveAttendanceByStudent\.get\(uid\)/,
  'persisted online attendance must remain separate from autonomous activity');
assert.match(teacherService, /onSnapshot\(/,
  'the Dashboard must receive the new marker through its realtime subscription');
assert.match(teacherService, /progressDocs = new Map\(snap\.docs/,
  'refresh/realtime snapshots must replace stale progress data before rebuilding rows');
assert.match(notifications, /getDaysWithoutActivity\(lastActivity, now\)/,
  'notifications must use the same calendar-day calculation as the Dashboard');
assert.doesNotMatch(technicalActivity, /LAST_PEDAGOGICAL_ACTIVITY_FIELD/,
  'login/session activity must not write the pedagogical marker');

console.log('pedagogical activity contract tests passed');
