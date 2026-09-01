import assert from 'node:assert/strict';
import { parseEffectiveFontSize, summarizeFormattingValues } from './workspaceFormattingState.ts';

assert.equal(summarizeFormattingValues([16]), 16, 'caret in 16 reports 16');
assert.equal(summarizeFormattingValues([48, 48]), 48, 'uniform 48 selection reports 48');
assert.equal(summarizeFormattingValues([32, 32, 32]), 32, 'uniform 32 selection reports 32');
assert.equal(summarizeFormattingValues([16, 48]), 'mixed', 'mixed font sizes report Mixed');
assert.equal(summarizeFormattingValues([true, true]), true, 'uniform bold reports active');
assert.equal(summarizeFormattingValues([true, false]), 'mixed', 'mixed bold reports Mixed');
assert.equal(parseEffectiveFontSize('16px'), 16);
assert.equal(parseEffectiveFontSize('48px'), 48);

console.log('workspace formatting state tests passed');
