import assert from 'node:assert/strict';
import test from 'node:test';
import type { Exercise } from '../types.ts';
import { createMasterySession, recordMasteryAttempt } from './masteryQueueEngine.ts';
import { buildFinalTestReport, finalTestSkillForExercise } from './finalTestReportEngine.ts';

const exercises: Exercise[] = [
  { id: 'lw', type: 'writing', assessmentMode: 'listening-writing', instruction: 'Listen and write.', audioValue: 'orange', correctValue: 'orange' },
  { id: 'sh', type: 'speaking', assessmentMode: 'shadowing', instruction: 'Repeat.', audioValue: 'It is orange.', correctValue: 'It is orange.' },
  { id: 'sp', type: 'speaking', assessmentMode: 'speaking', instruction: 'Answer.', audioValue: 'What color is it?', correctValue: 'It is orange.' },
];

test('explicit modes keep listening-writing, shadowing and speaking distinct', () => {
  assert.deepEqual(finalTestSkillForExercise(exercises[0]), ['listening', 'writing']);
  assert.deepEqual(finalTestSkillForExercise(exercises[1]), ['shadowing']);
  assert.deepEqual(finalTestSkillForExercise(exercises[2]), ['speaking']);
});

test('the final report uses real attempts and corrected errors', () => {
  let mastery = createMasterySession(exercises.map((exercise) => exercise.id));
  mastery = recordMasteryAttempt(mastery, 'lw', true);
  mastery = recordMasteryAttempt(mastery, 'sh', false);
  mastery = recordMasteryAttempt(mastery, 'sh', true);
  mastery = recordMasteryAttempt(mastery, 'sp', true);
  const report = buildFinalTestReport(exercises, mastery.items);
  assert.deepEqual(report.listening, { total: 1, firstTryCorrect: 1, correctedAfterError: 0, firstTryAccuracy: 100 });
  assert.deepEqual(report.shadowing, { total: 1, firstTryCorrect: 0, correctedAfterError: 1, firstTryAccuracy: 0 });
  assert.deepEqual(report.speaking, { total: 1, firstTryCorrect: 1, correctedAfterError: 0, firstTryAccuracy: 100 });
});
