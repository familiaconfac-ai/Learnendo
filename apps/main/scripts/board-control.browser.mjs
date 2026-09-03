import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const projectId = process.env.GCLOUD_PROJECT;
if (!projectId?.startsWith('demo-') || !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw Error('Demo emulators required');
initializeApp({ projectId }); const db = getFirestore(); const out = 'node_modules/.cache/board-browser'; await mkdir(out, { recursive: true });
await build({ entryPoints: ['scripts/board-control.fixture.tsx'], bundle: true, format: 'esm', outfile: `${out}/fixture.js`, define: { 'import.meta.env': '{}' }, plugins: [{ name: 'demo-browser-firebase', setup(b) {
  b.onResolve({ filter: /\/firebase$/ }, () => ({ path: 'firebase', namespace: 'demo' }));
  b.onLoad({ filter: /.*/, namespace: 'demo' }, () => ({ resolveDir: process.cwd(), contents: `
    import { initializeApp } from 'firebase/app'; import { getAuth, connectAuthEmulator } from 'firebase/auth'; import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
    export const app = initializeApp({ projectId: '${projectId}', apiKey: 'demo-key' });
    export const auth = getAuth(app); connectAuthEmulator(auth, 'http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}', {disableWarnings:true});
    export const db = getFirestore(app); connectFirestoreEmulator(db, '${process.env.FIRESTORE_EMULATOR_HOST.split(':')[0]}', ${process.env.FIRESTORE_EMULATOR_HOST.split(':')[1]});
    export const firebaseRuntimeConfig = { projectId: '${projectId}' };
  ` }));
} }] });
execFileSync(process.execPath, ['node_modules/tailwindcss/lib/cli.js', '-i', 'index.css', '-o', `${out}/style.css`, '--content', './src/**/*.{ts,tsx}']);
await writeFile(`${out}/index.html`, '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script type="module" src="/fixture.js"></script>');
if (!process.argv.includes('--build-only')) createServer(async (req, res) => {
  try {
    if (req.url === '/seed' && req.method === 'POST') {
      let body = ''; for await (const chunk of req) body += chunk;
      const {uid, role} = JSON.parse(body); if (!/^[A-Za-z0-9]+$/.test(uid) || !['teacher','joao','maria','pedro','ana'].includes(role)) throw Error('Invalid fixture actor');
      await db.doc(`users/${uid}`).set({ uid, role: role === 'teacher' ? 'teacher' : 'student', name: role });
      const ref = db.doc('liveClasses/browser-board');
      await ref.set({ ...(role === 'teacher' ? { createdBy: uid, teacherUid: uid } : { assignedStudentIds: FieldValue.arrayUnion(uid) }), labels: { [uid]: role } }, { merge: true });
      const workspace = db.doc('liveClasses/browser-board/shared/workspace');
      if (!(await workspace.get()).exists) {
        const html = '<p>Ub ----- bl</p>' + Array.from({ length: 75 }, (_, i) => `<p>Line ${i + 1}: document for logical scroll testing.</p>`).join('');
        const page = { id: 'p1', name: 'Page 1', docContent: html, items: [] };
        await workspace.set({ docContent: html, items: [], pages: [page, { ...page, id: 'p2', name: 'Page 2', docContent: '<p>Second page</p>' }], currentPageId: 'p1', surfaceMode: 'document', updatedBy: '', updatedByName: '', updatedAt: 1 });
      }
      if (role === 'teacher' && !(await ref.get()).data().assignedStudentIds) await ref.set({ assignedStudentIds: [] }, { merge: true });
      res.end('ok'); return;
    }
    const name = req.url.split('?')[0] === '/' ? 'index.html' : req.url.slice(1);
    if (!['index.html','fixture.js','style.css'].includes(name)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'); res.end(await readFile(`${out}/${name}`));
  } catch (error) { res.writeHead(500).end(String(error)); }
}).listen(4180, '127.0.0.1', () => console.log('Board browser fixture: http://127.0.0.1:4180/?role=teacher (other tabs: joao/maria/pedro/ana)'));
