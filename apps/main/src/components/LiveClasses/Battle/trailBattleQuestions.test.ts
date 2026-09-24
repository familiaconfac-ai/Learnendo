import assert from 'node:assert/strict';
import { randomizeTrailBattleQuestions } from './trailBattleQuestions';
import type { BattleQuestion } from './battleTypes';

const questions: BattleQuestion[] = [
  {
    id: 'exercise-1',
    sourceExerciseId: 'exercise-1',
    trailId: 'd1',
    kind: 'audio-choice',
    text: 'Listen and choose.',
    promptAudioText: 'Which animal says meow?',
    playAudioOnce: true,
    options: ['dog', 'cat', 'owl'],
    correctIndex: 1,
    correctIndexes: [1],
  },
  {
    id: 'exercise-2',
    sourceExerciseId: 'exercise-2',
    trailId: 'd1',
    kind: 'multiple-choice',
    text: 'Choose.',
    options: ['red', 'blue'],
    correctIndex: 0,
    correctIndexes: [0],
  },
];

const values = [0, 0, 0, 0, 0];
const randomized = randomizeTrailBattleQuestions(questions, () => values.shift() ?? 0);

assert.deepEqual(randomized.map((question) => question.id), ['exercise-2', 'exercise-1']);
const listening = randomized.find((question) => question.id === 'exercise-1');
assert.ok(listening);
assert.equal(listening.sourceExerciseId, 'exercise-1');
assert.equal(listening.trailId, 'd1');
assert.equal(listening.promptAudioText, 'Which animal says meow?');
assert.equal(listening.options?.[listening.correctIndex ?? -1], 'cat');
assert.deepEqual(questions[0].options, ['dog', 'cat', 'owl']);

console.log('trailBattleQuestions tests passed');
