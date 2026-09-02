import assert from 'node:assert/strict';
import test from 'node:test';
import { createLanguageContext, getCourseTargetLanguage, resolveLegacyBaseLanguage, isBaseLanguage, type BaseLanguage, type TargetLanguage } from './languageContext.ts';

test('base, target and UI coexist independently for the approved scenarios', () => {
  const pairs: [BaseLanguage, TargetLanguage][] = [['pt','en'], ['es','en'], ['en','pt'], ['pt','es'], ['pt','el'], ['en','el'], ['es','he']];
  for (const [baseLanguage, targetLanguage] of pairs) {
    const context = createLanguageContext({ baseLanguage, targetLanguage });
    assert.equal(context.baseLanguage, baseLanguage);
    assert.equal(context.targetLanguage, targetLanguage);
    assert.equal(context.uiLanguage, baseLanguage);
    assert.equal(context.instructionLanguage, baseLanguage);
    const switched = createLanguageContext({ ...context, targetLanguage: 'es' });
    assert.equal(switched.baseLanguage, baseLanguage);
    assert.equal(switched.uiLanguage, baseLanguage);
  }
  assert.equal(createLanguageContext({ baseLanguage: 'pt', targetLanguage: 'en', uiLanguage: 'es' }).uiLanguage, 'es');
});

test('courses identify targets including both Portuguese curricula, never the base', () => {
  for (const [course, target] of Object.entries({ english: 'en', spanish: 'es', portuguese_foreigners: 'pt', portuguese_native: 'pt', greek_koine: 'el', hebrew_biblical: 'he' })) {
    assert.equal(getCourseTargetLanguage(course), target);
  }
  assert.equal(getCourseTargetLanguage('unknown'), null);
  assert.equal(getCourseTargetLanguage('toString'), null);
  for (const language of ['el', 'he']) {
    assert.equal(isBaseLanguage(language), false);
    assert.throws(() => createLanguageContext({ baseLanguage: language as BaseLanguage, targetLanguage: 'en' }));
  }
});

test('legacy bootstrap preserves a stored support preference regardless of selected target', () => {
  for (const target of ['en','pt','es','el','he']) assert.equal(resolveLegacyBaseLanguage('pt', target), 'pt');
  assert.equal(resolveLegacyBaseLanguage(null, 'es'), 'es');
  assert.equal(resolveLegacyBaseLanguage(null, 'he'), 'en');
  assert.equal(resolveLegacyBaseLanguage('el', 'pt'), 'pt');
});
