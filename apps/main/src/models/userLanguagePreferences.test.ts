import assert from 'node:assert/strict';
import test from 'node:test';
import { isBaseLanguage, isTargetLanguage, resolveRuntimeLanguageContext } from './languageContext.ts';
import { mapUserLanguagePreferences, validateUserLanguagePreferences } from './userLanguagePreferences.ts';
import { cacheUserBaseLanguage, readUserBaseLanguage, userBaseLanguageStorageKey } from '../utils/userLanguageStorage.ts';
import { getEffectiveViewRole } from '../services/roleMode.ts';

test('optional profile preferences validate without inventing a persisted default', () => {
  assert.deepEqual(mapUserLanguagePreferences({}), {});
  assert.deepEqual(mapUserLanguagePreferences({ baseLanguage: 'he', learningLanguages: ['en', 'fr'] }), {});
  assert.deepEqual(mapUserLanguagePreferences({ baseLanguage: 'pt', learningLanguages: ['el', 'he'] }), { baseLanguage: 'pt', learningLanguages: ['el', 'he'] });
  for (const value of ['en', 'pt', 'es']) assert.ok(isBaseLanguage(value));
  for (const value of ['el', 'he']) { assert.ok(isTargetLanguage(value)); assert.equal(isBaseLanguage(value), false); }
  for (const input of [{ baseLanguage: 'el' }, { baseLanguage: 'pt', learningLanguages: ['en', 'en'] }, { baseLanguage: 'en', learningLanguages: ['fr'] }]) {
    assert.throws(() => validateUserLanguagePreferences(input as never));
  }
});

test('P0: A/PT → logout → B/ES → logout → A/PT; legacy and tab caches cannot leak', () => {
  const values = new Map<string, string>([['learnendo_base_ui_lang', 'pt'], ['learnendo_user_language', 'he']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  cacheUserBaseLanguage(storage, 'A', 'pt'); cacheUserBaseLanguage(storage, 'B', 'es');
  for (const [uid, base] of [['A', 'pt'], ['B', 'es'], ['A', 'pt']] as const) {
    const result = resolveRuntimeLanguageContext({ uid, profile: { uid: uid === 'A' ? 'B' : 'A', baseLanguage: 'en' },
      cachedBaseLanguage: readUserBaseLanguage(storage, uid), legacyBaseLanguage: 'pt', courseId: 'english' });
    assert.equal(result.baseLanguage, base);
    assert.equal(result.uiLanguage, base);
  }
  assert.equal(resolveRuntimeLanguageContext({ uid: null, profile: { uid: 'A', baseLanguage: 'pt' }, cachedBaseLanguage: 'pt', courseId: 'english' }).baseLanguage, 'en');
  const fresh = resolveRuntimeLanguageContext({ uid: 'new-user', profile: { uid: 'new-user' }, cachedBaseLanguage: readUserBaseLanguage(storage, 'new-user'), legacyBaseLanguage: 'pt', courseId: 'english' });
  assert.equal(fresh.baseLanguage, 'en'); assert.equal(fresh.suggestedBaseLanguage, 'pt'); assert.equal(fresh.needsLanguageSetup, true);
  assert.equal(values.has(userBaseLanguageStorageKey('new-user')), false, 'resolution never writes an unconfirmed preference');
});

test('cross-device profile wins over UID cache, and course/view mode never changes the base', () => {
  for (const [baseLanguage, courseId, target] of [
    ['pt', 'english', 'en'], ['pt', 'spanish', 'es'], ['es', 'english', 'en'],
    ['en', 'greek_koine', 'el'], ['pt', 'hebrew_biblical', 'he'],
    ['en', 'portuguese_foreigners', 'pt'], ['es', 'portuguese_foreigners', 'pt'],
  ] as const) {
    for (const role of ['student', 'teacher', 'admin'] as const) {
      getEffectiveViewRole(role, 'student');
      const resolved = resolveRuntimeLanguageContext({ uid: 'A', profile: { uid: 'A', baseLanguage }, cachedBaseLanguage: 'en', legacyBaseLanguage: 'es', courseId });
      assert.equal(resolved.baseLanguage, baseLanguage); assert.equal(resolved.instructionLanguage, baseLanguage);
      assert.equal(resolved.uiLanguage, baseLanguage); assert.equal(resolved.targetLanguage, target);
      assert.equal(resolved.baseLanguageSource, 'profile');
    }
  }
});
