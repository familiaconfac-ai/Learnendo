import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlacementBank, requirePlacementIdentity } from './placementIdentity.ts';
import { getQuestionsForLanguage } from '../data/placementTestQuestions.ts';
import type { TargetLanguage } from './languageContext.ts';

test('unsupported targets have no questions and cannot construct a persistence identity', () => {
  for (const language of ['pt', 'es', 'el', 'he'] as TargetLanguage[]) {
    assert.equal(getPlacementBank(language), null);
    assert.deepEqual(getQuestionsForLanguage(language), []);
    assert.throws(() => requirePlacementIdentity(language));
  }
});
test('the existing bank is explicitly English regardless of the interface', () => {
  assert.ok(getQuestionsForLanguage('en').length > 0);
  for (const uiLanguage of ['en', 'pt', 'es']) {
    const record = { ...requirePlacementIdentity('en'), uiLanguage };
    assert.equal(record.languageCode, 'en');
    assert.equal(record.courseId, 'english');
    assert.equal(record.bankId, 'english-listening-v1');
  }
});
