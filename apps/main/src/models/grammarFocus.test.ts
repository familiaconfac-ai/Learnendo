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

test('course-scoped identities never share the legacy document', () => {
  const courses = ['english', 'spanish', 'portuguese_foreigners', 'portuguese_native', 'greek_koine', 'hebrew_biblical'];
  const ids = courses.map(course => grammarFocusDocumentId(course, 1, 'wb1_l1'));
  assert.equal(new Set(ids).size, courses.length);
  assert.equal(grammarFocusDocumentId('spanish', 1, 'es_wb1_l1'), 'spanish__wb1_l1');
  assert.equal(grammarFocusDocumentId('english', 2, 'lesson_1'), 'english__wb2_lesson_1');
  assert.equal(legacyGrammarFocusDocumentId(1, 'es_wb1_l1'), 'wb1_l1');
  assert.ok(ids.every(id => id !== legacyGrammarFocusDocumentId(1, 'wb1_l1')));
  assert.throws(() => grammarFocusDocumentId('unknown', 1, 'wb1_l1'));
  assert.throws(() => grammarFocusDocumentId('english', NaN, 'wb1_l1'));
  const doc = { schemaVersion: 2, courseId: 'spanish', targetLanguage: 'es', workbookId: 1, lessonId: 'wb1_l1' };
  assert.ok(matchesGrammarFocusIdentity(doc, 'spanish', 1, 'es_wb1_l1'));
  assert.equal(matchesGrammarFocusIdentity(doc, 'english', 1, 'wb1_l1'), false);
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
