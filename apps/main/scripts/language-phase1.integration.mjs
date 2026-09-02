import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const projectId = process.env.GCLOUD_PROJECT ?? '';
if (!projectId.startsWith('demo-') || !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Run this integration test inside Auth/Firestore emulators with a demo-* project.');
}
const root = resolve(import.meta.dirname, '..');
const entry = process.argv[2] ?? 'language-phase1.integration.ts';
if (!['language-phase1.integration.ts', 'grammar-focus-upgrade.integration.tsx'].includes(entry)) throw new Error('Unknown integration entry.');
const outfile = resolve(root, 'node_modules/.cache/' + entry.replace(/\.tsx?$/, '.mjs'));
await build({
  absWorkingDir: root, entryPoints: ['scripts/' + entry],
  outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external',
  plugins: [{ name: 'demo-firebase-initialization', setup(builder) {
    builder.onResolve({ filter: /\/firebase$/ }, () => ({ path: 'demo-firebase', namespace: 'demo-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'demo-test' }, () => ({
      loader: 'js', resolveDir: root,
      contents: `
        import { initializeApp } from 'firebase/app';
        import { getAuth, connectAuthEmulator } from 'firebase/auth';
        import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
        const app = initializeApp({ projectId: ${JSON.stringify(projectId)}, apiKey: 'demo-key' });
        export const auth = getAuth(app);
        connectAuthEmulator(auth, 'http://' + process.env.FIREBASE_AUTH_EMULATOR_HOST, { disableWarnings: true });
        export const db = getFirestore(app);
        const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
        connectFirestoreEmulator(db, host, Number(port));
        export const firebaseRuntimeConfig = { projectId: ${JSON.stringify(projectId)}, storageBucket: '' };
      `,
    }));
  } }],
});
await import(pathToFileURL(outfile).href);
