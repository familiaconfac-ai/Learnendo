import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createCertificatePdf } from '../node_modules/.cache/certificate-test-bundle.mjs';

const documentSource = readFileSync(new URL('../src/components/Certificate/CertificateDocument.tsx', import.meta.url), 'utf8');
const modalSource = readFileSync(new URL('../src/components/Certificate/CertificateModal.tsx', import.meta.url), 'utf8');
const dashboardSource = readFileSync(new URL('../src/components/Dashboard/Dashboard.tsx', import.meta.url), 'utf8');

test('certificate PDF is a nonempty A4 landscape vector document', () => {
  const doc = createCertificatePdf({ studentName: 'John McMartin', dateLabel: 'Date awarded after certification', certificateId: 'PREVIEW-DEMO', preview: true });
  assert.ok(doc.internal.pageSize.getWidth() > doc.internal.pageSize.getHeight());
  assert.ok(Math.abs(doc.internal.pageSize.getWidth() - 297) < 1);
  assert.ok(Math.abs(doc.internal.pageSize.getHeight() - 210) < 1);
  assert.ok(doc.output('arraybuffer').byteLength > 5_000);
});

test('preview is explicitly nonofficial and never creates certification state', () => {
  assert.match(modalSource, /PREVIEW - NOT AN OFFICIAL CERTIFICATE|PREVIEW-DEMO/);
  assert.match(modalSource, /No approval, official date or certificate record is created/);
  assert.doesNotMatch(modalSource, /setDoc|addDoc|updateDoc|saveCertificate/);
  assert.match(dashboardSource, /Preview Certificate/);
});

test('screen certificate preserves the required official text and reusable record path', () => {
  assert.match(documentSource, /CERTIFICATE[\s\S]*OF COMPLETION/);
  assert.match(documentSource, /10,800 exercises/);
  assert.match(documentSource, /AUTHORIZED SIGNATURE/);
  assert.match(documentSource, /LEARNENDO — LEARN ENGLISH WITH CONFIDENCE/);
  assert.match(documentSource, /certificate-signature\.png/);
  assert.doesNotMatch(documentSource, />Learnendo<\/p>/, 'the provisional typographic signature must be removed');
  assert.match(modalSource, /certificateDataFromRecord/);
});
