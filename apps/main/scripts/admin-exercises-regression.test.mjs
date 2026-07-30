import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const service = await readFile(new URL('../src/services/adminExerciseService.ts', import.meta.url), 'utf8');
const builder = await readFile(new URL('../src/components/AdminExercises/AdminExerciseBuilderPage.tsx', import.meta.url), 'utf8');
const verification = await readFile(new URL('../src/components/ProblemReports/AdminExerciseVerification.tsx', import.meta.url), 'utf8');
const rules = await readFile(new URL('../../../firestore.rules', import.meta.url), 'utf8');

for (const operation of ['createAdminExerciseDraft', 'saveAdminExerciseDraft', 'publishAdminExercise', 'disableAdminExercise', 'reactivateAdminExercise', 'restoreAdminExerciseVersion', 'duplicateAdminExercise']) {
  assert.match(service, new RegExp(`export async function ${operation}\\b`), `${operation} must exist`);
}
assert.ok((service.match(/runTransaction\(/g) ?? []).length >= 6, 'all multi-document transitions must use Firestore transactions');
assert.match(service, /transaction\.set\(doc\(canonicalRef, 'versions'/, 'publication/transition must append history');
assert.doesNotMatch(service, /transaction\.delete\(canonicalRef\)/, 'canonical exercises must never be hard-deleted');
assert.match(service, /transaction\.delete\(draftRef\)/, 'publish/restore must remove only the private draft');
assert.match(service, /PUBLISHED_EXERCISE_COLLECTION/, 'public projection must remain separate');

assert.match(builder, /<PracticeSection/, 'sandbox must use the production PracticeSection');
assert.doesNotMatch(builder, /progressService|masteryQueueEngine|lessonProgressionEngine/, 'admin sandbox must not touch learner state engines');
assert.match(builder, /new Image\(\)/, 'external image must be validated by browser loading');
assert.doesNotMatch(builder, /getStorage|uploadBytes|data:image|blob:/, 'Stage 1 must not persist images or use Firebase Storage');
assert.match(builder, /resolveExerciseSpeechLocale/, 'voice preview must use the central locale resolver');
assert.match(verification, /applyExerciseOverride/, 'verification must resolve published editorial content');

for (const collection of ['adminExercises', 'adminExerciseDrafts', 'publishedExercises']) {
  assert.match(rules, new RegExp(`match \/${collection}`), `rules must cover ${collection}`);
}
assert.match(rules, /match \/versions\/\{versionId\}[\s\S]*allow update, delete: if false;/, 'history must be immutable');
assert.match(rules, /match \/publishedExercises[\s\S]*allow read: if signedIn\(\);/, 'authenticated students may read only the public projection');

console.log('Admin exercise builder structural regression checks passed.');
