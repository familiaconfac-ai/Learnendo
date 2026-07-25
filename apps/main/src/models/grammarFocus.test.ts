import assert from 'node:assert/strict';
import test from 'node:test';
import {
  emptyGrammarFocusContent,
  grammarFocusDocumentId,
  hasGrammarFocusContent,
  normalizeGrammarFocusContent,
  normalizeGrammarFocusLanguage,
  validateGrammarFocusContent,
} from './grammarFocus.ts';

test('uses a stable workbook-qualified Firestore document id', () => {
  assert.equal(grammarFocusDocumentId(1, 'wb1_l1'), 'wb1_l1');
  assert.equal(grammarFocusDocumentId(2, 'lesson_1'), 'wb2_lesson_1');
});

test('normalizes the three supported locales and active language', () => {
  const content = normalizeGrammarFocusContent({ en: { title: 'Title', body: 'Body' } });
  assert.deepEqual(content.pt, { title: '', body: '' });
  assert.equal(normalizeGrammarFocusLanguage('pt'), 'pt');
  assert.equal(normalizeGrammarFocusLanguage('fr'), 'en');
});

test('validates size and rejects arbitrary HTML without rejecting Markdown', () => {
  const content = emptyGrammarFocusContent();
  content.en = { title: 'Letters', body: '# Heading\n\n**Bold** and *italic*\n- Example' };
  assert.equal(validateGrammarFocusContent(content), null);
  assert.equal(hasGrammarFocusContent(content), true);
  content.en.body = '<script>alert(1)</script>';
  assert.match(validateGrammarFocusContent(content) ?? '', /HTML is not allowed/);
});
