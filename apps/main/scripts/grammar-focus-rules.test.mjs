import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rules = await readFile(new URL('../../../firestore.rules', import.meta.url), 'utf8');

test('Grammar Focus rules require authentication for reads and admin for writes', () => {
  const start = rules.indexOf('match /grammarFocus/{grammarFocusId}');
  const end = rules.indexOf('match /users/{uid}', start);
  const block = rules.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(block, /allow read: if signedIn\(\)/);
  assert.match(block, /allow create: if isAdmin\(\) && validGrammarFocus/);
  assert.match(block, /allow update: if isAdmin\(\) && validGrammarFocus/);
  assert.match(block, /allow delete: if isAdmin\(\) && resource.data.schemaVersion == 2/);
});

test('Grammar Focus rules validate locales, metadata, field types and limits', () => {
  assert.match(rules, /data\.content\.keys\(\)\.hasOnly\(\['en', 'pt', 'es'\]\)/);
  assert.match(rules, /locale\.title\.size\(\) <= 160/);
  assert.match(rules, /locale\.body\.size\(\) <= 50000/);
  assert.match(rules, /locale\.body\.matches\('\[\^<>\]\*'\)/);
  assert.match(rules, /data\.updatedBy == request\.auth\.uid/);
  assert.match(rules, /data\.updatedAt is timestamp/);
});

test('Grammar Focus reports require teacher mode backed by a real teacher/admin account', () => {
  const start = rules.indexOf('match /exerciseReports/{reportId}');
  const end = rules.indexOf('match /liveClassGroups/{groupId}', start);
  const block = rules.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(block, /'grammar-focus'/);
  assert.match(block, /request\.resource\.data\.reporterRole == 'teacher'/);
  assert.match(block, /request\.resource\.data\.reporterRole == 'teacher'[\s\S]+isTeacherAccount\(\)/);
  assert.match(block, /request\.resource\.data\.userId == request\.auth\.uid/);
});
