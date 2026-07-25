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
  assert.match(block, /allow create, update: if isAdmin\(\) && validGrammarFocus/);
  assert.match(block, /allow delete: if isAdmin\(\)/);
});

test('Grammar Focus rules validate locales, metadata, field types and limits', () => {
  assert.match(rules, /data\.content\.keys\(\)\.hasOnly\(\['en', 'pt', 'es'\]\)/);
  assert.match(rules, /locale\.title\.size\(\) <= 160/);
  assert.match(rules, /locale\.body\.size\(\) <= 50000/);
  assert.match(rules, /locale\.body\.matches\('\[\^<>\]\*'\)/);
  assert.match(rules, /data\.updatedBy == request\.auth\.uid/);
  assert.match(rules, /data\.updatedAt is timestamp/);
});
