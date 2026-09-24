import assert from 'node:assert/strict';
import { buildLiveTrailCompletion, buildLiveTrailRecoveryPlan, getLiveTrailRecoveryAction, isSameLiveTrailCompletion } from './liveTrailTransition';
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

const stuckFixture = {
  state: {
    mainStageMode: 'trail',
    activeTrailIds: ['d1'],
    trailCompletion: { ...first, status: 'battle' as const },
  },
  exercise: { currentBlockId: '__complete__', isActive: true },
  battle: { id: 'battle', status: 'PLAYING' },
};

const resumePlan = buildLiveTrailRecoveryPlan({
  mode: 'trail',
  firstBlockId: 'block-first',
  courseId: 'english',
  workbookId: 2,
  lessonId: 'lesson-1',
  trailId: 'd1',
  trailLabel: 'Trail 1',
});
assert.equal(stuckFixture.exercise.currentBlockId, '__complete__');
assert.equal(resumePlan.exercise.currentBlockId, 'block-first');
assert.equal(resumePlan.state.trailCompletion, null);
assert.equal(resumePlan.state.mainStageMode, 'trail');
assert.equal(resumePlan.deleteBattleSession, true);
assert.equal(getLiveTrailRecoveryAction({
  mainStageMode: resumePlan.state.mainStageMode,
  currentBlockId: resumePlan.exercise.currentBlockId,
  completion: resumePlan.state.trailCompletion,
  activeTrailIds: resumePlan.state.activeTrailIds,
}), 'none');

const workspacePlan = buildLiveTrailRecoveryPlan({ mode: 'workspace' });
assert.equal(workspacePlan.state.mainStageMode, 'workspace');
assert.equal(workspacePlan.state.trailCompletion, null);
assert.equal(workspacePlan.state.activeTrailIds.length, 0);
assert.equal(workspacePlan.exercise.currentBlockId, null);
assert.equal(workspacePlan.exercise.isActive, false);
assert.equal(workspacePlan.deleteBattleSession, true);
assert.equal(getLiveTrailRecoveryAction({
  mainStageMode: workspacePlan.state.mainStageMode,
  currentBlockId: workspacePlan.exercise.currentBlockId,
  completion: workspacePlan.state.trailCompletion,
  activeTrailIds: workspacePlan.state.activeTrailIds,
}), 'none');

console.log('liveTrailTransition tests passed');
