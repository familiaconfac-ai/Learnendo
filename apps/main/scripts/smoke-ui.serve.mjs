import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';

const out = 'node_modules/.cache/smoke-ui';
await mkdir(out, { recursive: true });
await build({ entryPoints: ['scripts/smoke-ui.fixture.tsx'], bundle: true, format: 'esm', outfile: `${out}/fixture.js`, plugins: [{
  name: 'fixture-grammar', setup(b) {
    b.onResolve({ filter: /services\/grammarFocusService$/ }, () => ({ path: 'grammar-fixture', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
      export const subscribeGrammarFocus = (courseId, workbookId, lessonId, callback) => {
        callback({ courseId, workbookId, lessonId, content: { en: { title: 'English notes', body: 'English body' }, pt: { title: 'Notas existentes', body: '# Conteúdo preservado\\n\\n' + 'Texto de gramática.\\n\\n'.repeat(80) }, es: { title: 'Notas españolas', body: 'Contenido español' } } });
        return () => {};
      };
      export const subscribeLegacyGrammarFocus = (wb, lesson, callback) => { callback([]); return () => {}; };
      export const saveGrammarFocus = async value => value;
      export const assignLegacyGrammarFocus = async () => {};
    ` }));
    b.onResolve({ filter: /\/GrammarFocusReportModal$/ }, () => ({ path: 'report-fixture', namespace: 'report' }));
    b.onLoad({ filter: /.*/, namespace: 'report' }, () => ({ contents: 'export const GrammarFocusReportModal = () => null;' }));
  },
}] });
execFileSync(process.execPath, ['node_modules/tailwindcss/lib/cli.js', '-i', 'index.css', '-o', `${out}/tailwind.css`, '--content', './src/**/*.{ts,tsx},./scripts/smoke-ui.fixture.tsx']);
await writeFile(`${out}/index.html`, '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/tailwind.css"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script>');
createServer(async (req, res) => {
  const name = req.url === '/' ? 'index.html' : req.url?.slice(1);
  if (!['index.html','fixture.js','fixture.css','tailwind.css'].includes(name)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html');
  res.end(await readFile(`${out}/${name}`));
}).listen(4178, '127.0.0.1', () => console.log('Smoke fixture: http://127.0.0.1:4178 (mock data only)'));
