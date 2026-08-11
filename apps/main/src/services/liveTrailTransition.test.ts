import assert from 'node:assert/strict';
import { buildLiveTrailCompletion, isSameLiveTrailCompletion } from './liveTrailTransition';
import type { Day } from '../types';

const days = [
  { id: 'd1', type: 'practice', exercises: [] },
  { id: 'd2', type: 'practice', exercises: [] },
] as Day[];

const first = buildLiveTrailCompletion({
  lessonId: 'lesson-1',
  currentTrailId: 'd1',
  currentTrailLabel: 'Trail 1',
  lessonDays: days,
});

assert.equal(first.status, 'awaiting-decision');
assert.equal(first.nextTrailId, 'd2');
assert.equal(first.isLessonComplete, false);
assert.equal(isSameLiveTrailCompletion(first, 'lesson-1:d1'), true);
assert.equal(isSameLiveTrailCompletion(first, 'lesson-1:d2'), false);

const last = buildLiveTrailCompletion({
  lessonId: 'lesson-1',
  currentTrailId: 'd2',
  currentTrailLabel: 'Trail 2',
  lessonDays: days,
});

assert.equal(last.nextTrailId, null);
assert.equal(last.isLessonComplete, true);

console.log('liveTrailTransition tests passed');
