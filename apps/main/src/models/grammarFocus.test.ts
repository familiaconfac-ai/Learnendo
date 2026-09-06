import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalGrammarFocusLessonId,
  emptyGrammarFocusContent,
  GRAMMAR_FOCUS_LANGUAGES,
  grammarFocusDocumentId,
  legacyGrammarFocusDocumentId,
  matchesGrammarFocusIdentity,
  getLocalizedGrammarFocusContent,
  hasGrammarFocusContent,
  mergeGrammarFocusContent,
  normalizeGrammarFocusContent,
  normalizeGrammarFocusDocumentContent,
  normalizeGrammarFocusLanguage,
  validateGrammarFocusContent,
} from './grammarFocus.ts';
import {
  legacyGrammarFocusDocumentIds, readLegacyGrammarFocus, legacyGrammarFocusAssignmentError,
  availableGrammarFocusLanguages, visibleGrammarFocusLanguage, legacyGrammarFocusRevision,
} from './legacyGrammarFocus.ts';

test('both historical key algorithms remain discoverable without changing scoped identity', () => {
  for (const lesson of ['wb1_l1', 'es_wb1_l1', 'pt_wb1_l1']) {
    const ids = legacyGrammarFocusDocumentIds(1, lesson);
    for (const historical of ['wb1_l1', 'wb1_es_wb1_l1', 'wb1_pt_wb1_l1']) assert.ok(ids.includes(historical));
    assert.ok(ids.every(id => !id.includes('__')));
  }
  assert.ok(legacyGrammarFocusDocumentIds(2, 'es_lesson_1').includes('wb2_es_lesson_1'));
});

test('legacy aliases and other locales stay visible without assigning a curriculum', () => {
  const mixed = normalizeGrammarFocusDocumentContent({
    content: { en: { title: '', body: '' } },
    translations: { pt: { title: 'Histórico', content: 'Texto preservado' }, es: 'Texto anterior' },
    title: 'Original', body: 'Original body',
  });
  assert.deepEqual(mixed.en, { title: 'Original', body: 'Original body' });
  assert.equal(mixed.pt.body, 'Texto preservado');
  assert.equal(mixed.es.body, 'Texto anterior');
  const ptOnly = normalizeGrammarFocusDocumentContent({ locale: 'pt-BR', title: 'Título', content: 'Somente português' });
  assert.deepEqual(availableGrammarFocusLanguages(ptOnly), ['pt']);
  assert.equal(visibleGrammarFocusLanguage(ptOnly, 'en'), 'pt');
  const source = readLegacyGrammarFocus('wb1_l1', { content: ptOnly });
  assert.equal(source.assignment, null);
  // Text language cannot establish whether this belongs to EN, ES, or either Portuguese course.
  for (const course of ['english', 'spanish', 'portuguese_native', 'portuguese_foreigners']) {
    assert.equal(legacyGrammarFocusAssignmentError(source, course, 1, 'wb1_l1'), null);
  }
});

test('explicit provenance and historical prefixes constrain admin assignment', () => {
  const source = readLegacyGrammarFocus('wb1_l1', { courseId: 'english', workbookId: 1, lessonId: 'wb1_l1' });
  assert.equal(legacyGrammarFocusAssignmentError(source, 'english', 1, 'wb1_l1'), null);
  assert.match(legacyGrammarFocusAssignmentError(source, 'spanish', 1, 'es_wb1_l1')!, /course metadata/);
  const prefixed = readLegacyGrammarFocus('wb1_pt_wb1_l1', {});
  assert.match(legacyGrammarFocusAssignmentError(prefixed, 'english', 1, 'wb1_l1')!, /prefix/);
  assert.equal(legacyGrammarFocusAssignmentError(prefixed, 'portuguese_foreigners', 1, 'pt_wb1_l1'), null);
  assert.equal(legacyGrammarFocusAssignmentError(prefixed, 'portuguese_native', 1, 'pt_wb1_l1'), null);
  assert.equal(legacyGrammarFocusRevision({ a: 1, b: { y: 1, x: 2 } }), legacyGrammarFocusRevision({ b: { x: 2, y: 1 }, a: 1 }));
  assert.notEqual(legacyGrammarFocusRevision({ body: 'old' }), legacyGrammarFocusRevision({ body: 'changed' }));
});

test('English/Português/Español share one multilingual document; Greek/Hebrew keep their own', () => {
  const sharedFamilyCourses = ['english', 'spanish', 'portuguese_foreigners', 'portuguese_native'];
  const sharedIds = sharedFamilyCourses.map(course => grammarFocusDocumentId(course, 1, 'wb1_l1'));
  assert.equal(new Set(sharedIds).size, 1);
  assert.ok(sharedIds.every(id => id === 'english__wb1_l1'));
  assert.equal(grammarFocusDocumentId('spanish', 1, 'es_wb1_l1'), 'english__wb1_l1');
  assert.equal(grammarFocusDocumentId('english', 2, 'lesson_1'), 'english__wb2_lesson_1');
  assert.equal(grammarFocusDocumentId('greek_koine', 1, 'wb1_l1'), 'greek_koine__wb1_l1');
  assert.equal(grammarFocusDocumentId('hebrew_biblical', 1, 'wb1_l1'), 'hebrew_biblical__wb1_l1');
  assert.equal(legacyGrammarFocusDocumentId(1, 'es_wb1_l1'), 'wb1_l1');
  assert.ok(sharedIds.every(id => id !== legacyGrammarFocusDocumentId(1, 'wb1_l1')));
  assert.throws(() => grammarFocusDocumentId('unknown', 1, 'wb1_l1'));
  assert.throws(() => grammarFocusDocumentId('english', NaN, 'wb1_l1'));
  const doc = { schemaVersion: 2, courseId: 'english', targetLanguage: 'en', workbookId: 1, lessonId: 'wb1_l1' };
  // Any course in the shared family resolves identity against the same canonical document.
  assert.ok(matchesGrammarFocusIdentity(doc, 'spanish', 1, 'es_wb1_l1'));
  assert.ok(matchesGrammarFocusIdentity(doc, 'english', 1, 'wb1_l1'));
  assert.ok(matchesGrammarFocusIdentity(doc, 'portuguese_foreigners', 1, 'wb1_l1'));
  assert.equal(matchesGrammarFocusIdentity(doc, 'greek_koine', 1, 'wb1_l1'), false);
  assert.equal(matchesGrammarFocusIdentity({ ...doc, schemaVersion: 1 }, 'spanish', 1, 'wb1_l1'), false);
});

test('normalizes the three supported locales and active language', () => {
  const content = normalizeGrammarFocusContent({ en: { title: 'Title', body: 'Body' } });
  assert.deepEqual(content.pt, { title: '', body: '' });
  assert.equal(normalizeGrammarFocusLanguage('pt'), 'pt');
  assert.equal(normalizeGrammarFocusLanguage('pt-BR'), 'pt');
  assert.equal(normalizeGrammarFocusLanguage('es'), 'es');
  assert.equal(normalizeGrammarFocusLanguage('es-ES'), 'es');
  assert.equal(normalizeGrammarFocusLanguage('en-US'), 'en');
  assert.equal(normalizeGrammarFocusLanguage('fr'), 'en');
});

test('selects only the requested locale for every supported regional language code', () => {
  const content = {
    en: { title: 'EN', body: 'English' },
    pt: { title: 'PT', body: 'Português' },
    es: { title: 'ES', body: 'Español' },
  };
  for (const language of ['en', 'en-US']) {
    assert.deepEqual(getLocalizedGrammarFocusContent(content, language), content.en);
  }
  for (const language of ['pt', 'pt-BR']) {
    assert.deepEqual(getLocalizedGrammarFocusContent(content, language), content.pt);
  }
  for (const language of ['es', 'es-ES']) {
    assert.deepEqual(getLocalizedGrammarFocusContent(content, language), content.es);
  }
});

test('returns an empty locale instead of silently falling back to English', () => {
  const content = {
    en: { title: 'EN', body: 'English' },
    pt: { title: '', body: '' },
    es: { title: '', body: '' },
  };
  assert.deepEqual(getLocalizedGrammarFocusContent(content, 'pt-BR'), { title: '', body: '' });
});

test('loads translations schema and legacy top-level fields without losing English', () => {
  const translated = normalizeGrammarFocusDocumentContent({
    translations: { pt: { title: 'Letras', content: 'Conteúdo em português' } },
    title: 'Letters',
    content: 'Legacy English content',
  });
  assert.deepEqual(translated.en, { title: 'Letters', body: 'Legacy English content' });
  assert.deepEqual(translated.pt, { title: 'Letras', body: 'Conteúdo em português' });
  assert.deepEqual(translated.es, { title: '', body: '' });
});

test('merges all locales and prevents empty fields from erasing saved translations', () => {
  const existing = {
    en: { title: 'English', body: 'English body' },
    pt: { title: 'Português', body: 'Texto português' },
    es: { title: 'Español', body: 'Texto español' },
  };
  const incoming = {
    en: { title: '', body: '' },
    pt: { title: 'Português editado', body: 'Novo texto' },
    es: { title: '', body: '' },
  };
  const merged = mergeGrammarFocusContent(existing, incoming);
  assert.deepEqual(merged.en, existing.en);
  assert.deepEqual(merged.pt, incoming.pt);
  assert.deepEqual(merged.es, existing.es);
});

test('editing any one language preserves the other two', () => {
  const existing = {
    en: { title: 'EN', body: 'English' },
    pt: { title: 'PT', body: 'Português' },
    es: { title: 'ES', body: 'Español' },
  };
  for (const language of GRAMMAR_FOCUS_LANGUAGES) {
    const incoming = structuredClone(existing);
    incoming[language] = { title: `${language} edited`, body: `${language} body edited` };
    const merged = mergeGrammarFocusContent(existing, incoming);
    assert.deepEqual(merged, incoming);
  }
});

test('round-trips all three saved locales after a reload', () => {
  const savedDocument = {
    content: {
      en: { title: 'EN', body: 'English' },
      pt: { title: 'PT', body: 'Português' },
      es: { title: 'ES', body: 'Español' },
    },
  };
  assert.deepEqual(normalizeGrammarFocusDocumentContent(savedDocument), savedDocument.content);
});

test('validates size and rejects arbitrary HTML without rejecting Markdown', () => {
  const content = emptyGrammarFocusContent();
  content.en = { title: 'Letters', body: '# Heading\n\n**Bold** and *italic*\n- Example' };
  assert.equal(validateGrammarFocusContent(content), null);
  assert.equal(hasGrammarFocusContent(content), true);
  content.en.body = '<script>alert(1)</script>';
  assert.match(validateGrammarFocusContent(content) ?? '', /HTML is not allowed/);
});
