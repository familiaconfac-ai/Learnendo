import assert from 'node:assert/strict';
import { buildLiveTrailCompletion, getLiveTrailRecoveryAction, isSameLiveTrailCompletion } from './liveTrailTransition';
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

assert.equal(getLiveTrailRecoveryAction({
  mainStageMode: 'trail',
  currentBlockId: '__complete__',
  completion: { ...first, status: 'battle' },
  activeTrailIds: ['d1'],
}), 'restore-completed-trail');
assert.equal(getLiveTrailRecoveryAction({
  mainStageMode: 'trail',
  currentBlockId: '__complete__',
  completion: { ...first, status: 'advancing' },
}), 'resume-advancing');
assert.equal(getLiveTrailRecoveryAction({
  mainStageMode: 'trail',
  currentBlockId: '__complete__',
  completion: null,
  activeTrailIds: ['d1'],
}), 'restore-active-trail');
assert.equal(getLiveTrailRecoveryAction({
  mainStageMode: 'workspace',
  currentBlockId: '__complete__',
  completion: { ...first, status: 'battle' },
}), 'none');

console.log('liveTrailTransition tests passed');
