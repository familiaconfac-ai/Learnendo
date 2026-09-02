import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'node_modules/.cache/runtime-report-fixture');
await mkdir(out, { recursive: true });
const mocks = {
  exerciseOverrideService: 'export const loadPublishedDayOverrides = async () => ({}); export const readCachedDayOverrides = () => ({});',
  dayExerciseAuthoringService: 'export const loadPublishedDaySequence = async () => null; export const readCachedDaySequence = () => null; export const resolveAuthoredDayExercises = (exercises) => exercises;',
  firebase: 'export const db = {};',
  firestore: `export const doc = (...args) => args; export const serverTimestamp = () => new Date().toISOString();
    export const setDoc = async (_ref, data) => window.dispatchEvent(new CustomEvent('fixture:report-saved', { detail: data }));
    export const collection = doc, getCountFromServer = doc, getDocs = doc, limit = doc, onSnapshot = doc,
    orderBy = doc, query = doc, startAfter = doc, updateDoc = doc, where = doc;`,
};
await build({
  absWorkingDir: root, entryPoints: ['scripts/runtime-report-fixture.tsx'], bundle: true, format: 'esm',
  outfile: resolve(out, 'fixture.js'), loader: { '.svg': 'dataurl' },
  define: { 'import.meta.env': JSON.stringify({ DEV: false }), 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'fixture-persistence', setup(builder) {
    builder.onResolve({ filter: /(?:exerciseOverrideService|dayExerciseAuthoringService|\/firebase|firebase\/firestore)$/ }, (args) => {
      const key = args.path === 'firebase/firestore' ? 'firestore' : args.path.split('/').at(-1);
      return { path: key, namespace: 'fixture-mock' };
    });
    builder.onLoad({ filter: /.*/, namespace: 'fixture-mock' }, (args) => ({ contents: mocks[args.path], loader: 'js' }));
  } }],
});
await build({ absWorkingDir: root, entryPoints: ['api/tts.ts'], bundle: true, platform: 'node', format: 'esm', outfile: resolve(out, 'tts.mjs') });
const { default: tts } = await import(pathToFileURL(resolve(out, 'tts.mjs')));
execFileSync(process.execPath, [resolve(root, 'node_modules/tailwindcss/lib/cli.js'), '-i', 'index.css', '-o', resolve(out, 'fixture.css')], { cwd: root, stdio: 'pipe' });
createServer(async (req, res) => {
  if (req.url === '/api/tts') return tts(req, res);
  if (req.url === '/fixture.js' || req.url === '/fixture.css') {
    res.setHeader('content-type', req.url.endsWith('.js') ? 'text/javascript' : 'text/css');
    return res.end(await readFile(resolve(out, req.url.slice(1))));
  }
  res.setHeader('content-type', 'text/html');
  res.end('<!doctype html><html><meta charset="utf-8"><title>Runtime report integration test</title><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script></html>');
}).listen(5187, '127.0.0.1', () => console.log('Fixture ready: http://127.0.0.1:5187 (real TTS, simulated Firestore)'));
