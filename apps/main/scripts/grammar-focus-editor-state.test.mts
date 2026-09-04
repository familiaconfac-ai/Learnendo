// FASE 2 — real regression test for the Grammar Focus editor draft-loss bug.
// Bundles the actual GrammarFocusModal with a controllable subscribeGrammarFocus mock so we can
// push snapshots (stale, metadata-only, self-save, external) and assert the local draft survives.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import React from 'react';
import test from 'node:test';

const out = 'node_modules/.cache/gf-editor-state';
await mkdir(out, { recursive: true });

const baseContent = {
  en: { title: 'Using Há', body: '- Há um relógio.\n- Há uma porta.' },
  pt: { title: 'Usando Há', body: '- Há um relógio.\n- Há uma porta.' },
  es: { title: 'Usando Há', body: '- Há un reloj.' },
};
const canonicalDoc = { courseId: 'english', targetLanguage: 'en', workbookId: 3, lessonId: 'wb3_l25', content: baseContent, schemaVersion: 2, updatedBy: 'admin' };

// Mock service exposes a global snapshot pusher.
const serviceMock = `
  globalThis.__gfPush = null;
  const doc = ${JSON.stringify(canonicalDoc)};
  export const subscribeGrammarFocus = (courseId, workbookId, lessonId, onValue) => {
    globalThis.__gfPush = onValue;
    onValue(doc);
    return () => {};
  };
  export const subscribeLegacyGrammarFocus = (wb, lesson, onValue) => { onValue([]); return () => {}; };
  export const saveGrammarFocus = async (value) => ({ courseId: value.courseId, workbookId: value.workbookId, lessonId: value.lessonId, content: value.content, schemaVersion: 2, updatedBy: value.updatedBy });
  export const assignLegacyGrammarFocus = async () => {};
`;

await build({
  entryPoints: ['scripts/gf-editor-state.fixture.tsx'], bundle: true, format: 'esm', outfile: `${out}/fixture.js`,
  define: { 'import.meta.env': '{}' }, jsx: 'automatic',
  plugins: [{
    name: 'mock-service', setup(b) {
      b.onResolve({ filter: /services\/grammarFocusService$/ }, () => ({ path: 'svc', namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: serviceMock }));
      b.onResolve({ filter: /\/GrammarFocusReportModal$/ }, () => ({ path: 'rep', namespace: 'rep' }));
      b.onLoad({ filter: /.*/, namespace: 'rep' }, () => ({ contents: 'export const GrammarFocusReportModal = () => null;' }));
    },
  }],
});

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
for (const key of ['navigator', 'HTMLElement', 'HTMLTextAreaElement', 'Event', 'MouseEvent', 'Node', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
  try { Object.defineProperty(globalThis, key, { value: (dom.window as any)[key], configurable: true, writable: true }); } catch { /* already defined */ }
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(dom.window as any).confirm = () => true;
// expose push into the window context
(dom.window as any).__gfPush = null;

const { act } = React;
const fixtureCode = await readFile(`${out}/fixture.js`, 'utf8');
(dom.window as any).eval(fixtureCode);

const w = dom.window as any;
// The modal uses createPortal(..., document.body), so assertions target body, not just #root.
const container = w.document.body;
const tick = () => new Promise((r) => setTimeout(r, 0));
async function flush() { for (let i = 0; i < 6; i++) await tick(); }
function setBody(value: string) {
  const ta = container.querySelector('textarea') as any;
  const setter = Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, 'value')!.set!;
  setter.call(ta, value);
  ta.dispatchEvent(new w.Event('input', { bubbles: true }));
}
const body = () => (container.querySelector('textarea') as HTMLTextAreaElement | null)?.value;
const clickByText = (re: RegExp) => { const b = Array.from(container.querySelectorAll('button')).find((x: any) => re.test(x.textContent ?? '')) as HTMLElement | undefined; b?.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return Boolean(b); };
const pushed = (content: any) => { w.__gfPush?.({ ...canonicalDoc, content }); };

test('draft survives stale, metadata-only, self-save and post-save snapshots; conflict warns; cancel shows remote', async () => {
  await flush();
  assert.ok(body() === undefined, 'no editor before Edit');
  assert.ok(clickByText(/Edit|Editar/i), 'open editor');
  await flush();
  assert.equal(body(), baseContent.pt.body, 'editor loads canonical PT');

  const newBody = '- Há um relógio.\n- Há uma porta.\n- Tem um relógio.\n- Tem uma porta.';
  setBody(newBody); await flush();
  assert.equal(body(), newBody, 'local draft updated (title/Enter/duplicates simulated in body)');

  // 8/9 stale persisted snapshot — draft must NOT change
  pushed(baseContent); await flush();
  assert.equal(body(), newBody, 'stale snapshot must not overwrite local draft');

  // 10/11 metadata-only snapshot (same content) — draft must NOT change
  pushed(baseContent); await flush();
  assert.equal(body(), newBody, 'metadata-only snapshot must not change draft');

  // 12-14 save, then self-save snapshot — no false conflict
  assert.ok(clickByText(/Save|Salvar|Guardar/i), 'click Save');
  await flush();
  pushed({ ...baseContent, pt: { title: baseContent.pt.title, body: newBody } }); await flush();
  assert.ok(!/outra janela|otra ventana|another window/i.test(container.textContent ?? ''), 'no false conflict on self-save');

  // 15-17 continue editing after save, then another snapshot arrives
  clickByText(/Edit|Editar/i); await flush();
  const newer = newBody + '\n- Linha nova após save.';
  setBody(newer); await flush();
  pushed({ ...baseContent, pt: { title: baseContent.pt.title, body: newBody } }); await flush();
  assert.equal(body(), newer, 'newest post-save edit must survive incoming snapshot');

  // conflict real: remote different doc arrives while editing
  const remoteBody = 'Conteúdo remoto diferente de outra sessão.';
  pushed({ ...baseContent, pt: { title: baseContent.pt.title, body: remoteBody } }); await flush();
  assert.equal(body(), newer, 'local content intact during external change');
  assert.ok(/outra janela|otra ventana|another window/i.test(container.textContent ?? ''), 'external-change warning shown');

  // Cancel discards local draft and shows latest remote documentValue
  clickByText(/Cancel/i); await flush();
  assert.ok((container.textContent ?? '').includes(remoteBody), 'cancel shows the latest remote content');
  console.log('FASE 2 editor state regression: all assertions passed');
});
