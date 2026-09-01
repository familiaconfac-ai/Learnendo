import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const grammar = await readFile(new URL('../src/components/GrammarFocus/GrammarFocusModal.tsx', import.meta.url), 'utf8');

assert.match(app, /const actualRole = userAccountProfile\?\.role \?\? 'student'/, 'actual role must come from the Firestore profile');
assert.match(app, /const effectiveRole = getEffectiveViewRole\(actualRole, userViewMode\)/, 'effective role must be derived from the allowed view mode');
assert.match(app, /const canManageUsers = isActualAdmin && isAdmin/, 'admin operations require both actual and effective admin roles');
assert.match(app, /menuVisibility\.teacherDashboard/);
assert.match(app, /menuVisibility\.problemReports/);
assert.match(app, /menuVisibility\.generalProblemReport/);
assert.match(app, /userRole=\{effectiveRole\}/, 'Grammar Focus must receive the simulated role');

const viewModeHandler = app.match(/const handleViewModeChange = \(nextMode: UserViewMode\) => \{([\s\S]*?)\n  \};/)?.[1] ?? '';
assert.match(viewModeHandler, /normalizeUserViewMode\(actualRole, nextMode\)/);
assert.match(viewModeHandler, /setUserViewMode\(normalized\)/);
assert.doesNotMatch(viewModeHandler, /updateUserAccountRole|setDoc|updateDoc/, 'changing test mode must never persist an account role');

assert.match(grammar, /getGrammarFocusActions\(userRole\)/, 'Grammar Focus actions must follow its effective role prop');

console.log('role mode UI tests passed');
