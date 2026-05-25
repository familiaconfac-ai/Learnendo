/**
 * Export a LessonPack as a raw, text-first PDF via the browser's print dialog.
 *
 * No external library is required — we generate a minimal HTML document and
 * call window.print() inside the new tab. The user can Save as PDF from the
 * browser's print dialog.
 *
 * Popup blockers may suppress the new tab; in that case the browser shows a
 * notification or the tab opens after the user allows it.
 */
import type { LessonPack, LanguageCode } from '../types';

const LANG_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  pt: 'Portuguese',
  es: 'Spanish',
  el: 'Greek',
  he: 'Hebrew',
};

/** Escape characters that are special in HTML to prevent XSS in the generated document. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportLessonAsPdf(pack: LessonPack): void {
  const langName = LANG_NAMES[pack.language] ?? pack.language.toUpperCase();

  const vocabSection =
    pack.vocabulary && pack.vocabulary.length > 0
      ? `<h2>Vocabulary</h2>
<table>
  <tr><th>Word / Phrase</th><th>Translation</th><th>Type</th></tr>
  ${pack.vocabulary
    .map(
      (v) =>
        `<tr><td>${esc(v.word)}</td><td>${esc(v.translation)}</td><td>${esc(v.type ?? '')}</td></tr>`,
    )
    .join('\n  ')}
</table>`
      : '';

  const structuresSection =
    pack.structures && pack.structures.length > 0
      ? `<h2>Grammar Patterns</h2>
<ol>
  ${pack.structures
    .map(
      (s) =>
        `<li><code>${esc(s.pattern)}</code> — <em>${esc(s.example)}</em>${s.notes ? `<br/><small>${esc(s.notes)}</small>` : ''}</li>`,
    )
    .join('\n  ')}
</ol>`
      : '';

  const exercisesSection =
    pack.items.length > 0
      ? `<h2>Exercises</h2>
<ol>
  ${pack.items
    .map((item) => {
      const opts =
        item.options && item.options.length > 0
          ? `<ol type="A">${item.options.map((o) => `<li>${esc(o)}</li>`).join('')}</ol>`
          : '';
      return `<li>${esc(item.prompt)}${opts}</li>`;
    })
    .join('\n  ')}
</ol>`
      : '';

  const themeLine =
    pack.themes && pack.themes.length > 0
      ? `<p><strong>Topics:</strong> ${pack.themes.map(esc).join(', ')}</p>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="${esc(pack.language)}">
<head>
  <meta charset="utf-8"/>
  <title>${esc(pack.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; max-width: 720px; margin: 40px auto; color: #111; line-height: 1.5; }
    h1 { font-size: 22px; border-bottom: 2px solid #000; padding-bottom: 6px; }
    h2 { font-size: 15px; margin-top: 28px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin-top: 8px; }
    th, td { border: 1px solid #bbb; padding: 5px 8px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; font-weight: bold; }
    code { background: #f4f4f4; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
    .meta { color: #555; font-size: 12px; margin-top: 2px; }
    @media print { button { display: none !important; } }
  </style>
</head>
<body>
  <h1>${esc(pack.title)}</h1>
  <p class="meta">
    <strong>Language:</strong> ${esc(langName)}
    ${pack.lessonNumber ? `&nbsp;|&nbsp; <strong>Lesson:</strong> ${pack.lessonNumber}` : ''}
    &nbsp;|&nbsp; <strong>Status:</strong> Draft
  </p>
  <p><em>${esc(pack.description)}</em></p>
  ${themeLine}

  ${vocabSection}
  ${structuresSection}
  ${exercisesSection}

  <script>window.print();<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
