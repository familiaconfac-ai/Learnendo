import assert from 'node:assert/strict';
import test from 'node:test';
import { parseControlledMarkdown, sanitizeMarkdownText } from './controlledMarkdown.ts';

test('parses controlled headings, paragraphs, lists and examples', () => {
  assert.deepEqual(parseControlledMarkdown('# Title\n\nParagraph\n\n- One\n- Two\n\n1. First\n2. Second\n\n> Example: I am ready.'), [
    { type: 'heading', level: 1, text: 'Title' },
    { type: 'paragraph', text: 'Paragraph' },
    { type: 'unordered-list', items: ['One', 'Two'] },
    { type: 'ordered-list', items: ['First', 'Second'] },
    { type: 'example', text: 'I am ready.' },
  ]);
});

test('removes unsafe control characters while retaining text for React escaping', () => {
  assert.equal(sanitizeMarkdownText('Safe\u0000 text\r\n<script>'), 'Safe text\n<script>');
});
