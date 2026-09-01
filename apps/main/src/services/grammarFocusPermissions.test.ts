import assert from 'node:assert/strict';
import { getGrammarFocusActions } from './grammarFocusPermissions.ts';

assert.deepEqual(getGrammarFocusActions('student'), {
  edit: false, board: false, slides: false, practice: false, report: false,
});
assert.deepEqual(getGrammarFocusActions('teacher'), {
  edit: false, board: true, slides: true, practice: true, report: true,
});
assert.deepEqual(getGrammarFocusActions('admin'), {
  edit: true, board: true, slides: true, practice: true, report: false,
});

console.log('grammar focus role permission tests passed');
