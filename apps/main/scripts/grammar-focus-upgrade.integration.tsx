import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, terminate, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseRuntimeConfig } from '../src/services/firebase';
import { subscribeLegacyGrammarFocus, subscribeGrammarFocus, assignLegacyGrammarFocus, saveGrammarFocus } from '../src/services/grammarFocusService';
import { emptyGrammarFocusContent, grammarFocusDocumentId, type GrammarFocusDocument } from '../src/models/grammarFocus';
import { readLegacyGrammarFocus, visibleGrammarFocusLanguage, type LegacyGrammarFocus } from '../src/models/legacyGrammarFocus';
import { LegacyGrammarFocusCard } from '../src/components/GrammarFocus/GrammarFocusModal';
import { appendGrammarFocusWorkspacePage } from '../src/services/grammarFocusWorkspace';

function firstSnapshot<T>(subscribe: (done: (value: T) => void, fail: (error: Error) => void) => () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => { unsubscribe(); reject(new Error('Snapshot timeout')); }, 15000);
    unsubscribe = subscribe(value => { clearTimeout(timeout); unsubscribe(); resolve(value); }, error => { clearTimeout(timeout); unsubscribe(); reject(error); });
  });
}
const readLegacy = (lessonId = 'wb1_l1') => firstSnapshot<LegacyGrammarFocus[]>((done, fail) => subscribeLegacyGrammarFocus(1, lessonId, done, fail));
const readOfficial = (courseId: string, lessonId = 'wb1_l1') => firstSnapshot<GrammarFocusDocument | null>((done, fail) => subscribeGrammarFocus(courseId, 1, lessonId, done, fail));

// Exact fields and key algorithm written by commit 392a105. 216dae6 canonicalized
// the key and lessonId but retained this schema. No courseId existed in either writer.
function oldDocument(lessonId: string, language: 'en' | 'es' | 'pt') {
  return { workbookId: 1, lessonId, schemaVersion: 1, updatedAt: Timestamp.fromMillis(1700000000000), updatedBy: 'historical-admin',
    content: { ...emptyGrammarFocusContent(), [language]: { title: `Original ${language}`, body: `Preserved **${language}** grammar.` } } };
}
const adminApp = initializeApp({ projectId: firebaseRuntimeConfig.projectId }, 'grammar-upgrade');
const adminDb = getFirestore(adminApp);
try {
  const { user } = await signInAnonymously(auth);
  await adminDb.doc(`users/${user.uid}`).set({ role: 'admin' });
  const fixtures = [
    { courseId: 'english', lessonId: 'wb1_l1', sourceId: 'wb1_l1', language: 'en' },
    { courseId: 'spanish', lessonId: 'es_wb1_l1', sourceId: 'wb1_es_wb1_l1', language: 'es' },
    { courseId: 'portuguese_foreigners', lessonId: 'pt_wb1_l1', sourceId: 'wb1_pt_wb1_l1', language: 'pt' },
  ] as const;
  const originals = new Map<string, ReturnType<typeof oldDocument>>();
  for (const fixture of fixtures) {
    const data = oldDocument(fixture.lessonId, fixture.language);
    originals.set(fixture.sourceId, data);
    await adminDb.doc(`grammarFocus/${fixture.sourceId}`).set(data);
  }

  // Start the new readers against pre-existing old documents, without a migration write.
  for (const { courseId, lessonId } of fixtures) {
    assert.equal(await readOfficial(courseId, lessonId), null);
    const sources = await readLegacy(lessonId);
    assert.equal(sources.length, 3, 'both generations of key must be discovered from every curriculum');
    for (const source of sources) {
      assert.equal(source.assignment, null);
      const html = renderToStaticMarkup(<LegacyGrammarFocusCard source={source} activeLanguage="pt-BR"
        courseId={courseId} workbookId={1} lessonId={lessonId} canAssign destinationExists={false} onAssign={async () => {}} />);
      assert.match(html, /sem curso confirmado/);
      assert.match(html, /Preserved/);
      assert.match(html, /Idioma do conteúdo/);
      assert.match(html, /<option[^>]+selected/);
      assert.doesNotMatch(html, /<details[^>]*>\s*<summary[^>]*>Legacy/, 'legacy notes must be visible without opening a disclosure');
    }
  }
  console.log('Upgrade read/render: exact v1 documents at wb1_l1, wb1_es_wb1_l1, wb1_pt_wb1_l1; other-locale notes visible and unassigned.');

  const sources = await readLegacy();
  const spanishSource = sources.find(source => source.documentId === 'wb1_es_wb1_l1')!;
  await assert.rejects(assignLegacyGrammarFocus({ source: spanishSource, courseId: 'english', workbookId: 1, lessonId: 'wb1_l1', updatedBy: user.uid }), /prefix conflicts/);
  // Explicitly assign the reviewed source to the selected curriculum. No automatic inference.
  for (const fixture of fixtures) {
    const source = sources.find(value => value.documentId === fixture.sourceId)!;
    const destinationId = await assignLegacyGrammarFocus({ source, ...fixture, workbookId: 1, updatedBy: user.uid });
    assert.equal(destinationId, grammarFocusDocumentId(fixture.courseId, 1, fixture.lessonId));
    const saved = (await readOfficial(fixture.courseId, fixture.lessonId))!;
    assert.deepEqual(saved.content, originals.get(fixture.sourceId)!.content);
    const receipt = (await getDoc(doc(db, 'grammarFocusLegacyAssignments', fixture.sourceId))).data()!;
    assert.equal(receipt.destinationId, destinationId);
    assert.equal(receipt.assignedBy, user.uid);
    assert.deepEqual(receipt.content, source.content);
    assert.equal(receipt.sourceData.updatedBy, 'historical-admin');
    await assert.rejects(assignLegacyGrammarFocus({ source, ...fixture, workbookId: 1, updatedBy: user.uid }), /already assigned/);
  }
  const archived = await readLegacy();
  assert.ok(archived.every(source => source.assignment?.destinationId));
  assert.equal((await readOfficial('english'))!.content.en.title, 'Original en');
  assert.equal((await readOfficial('spanish'))!.content.es.title, 'Original es');
  assert.equal((await readOfficial('portuguese_foreigners'))!.content.pt.title, 'Original pt');
  console.log('Explicit assignment: EN/ES/PT scopes isolated, every locale copied, immutable source and receipt retained.');

  // Actual workspace publisher uses the migrated scoped body, including other-locale fallback.
  await adminDb.doc('liveClasses/grammar-upgrade').set({ createdBy: user.uid, teacherUid: user.uid });
  for (const fixture of fixtures) {
    const saved = (await readOfficial(fixture.courseId, fixture.lessonId))!;
    const language = visibleGrammarFocusLanguage(saved.content, 'en');
    const content = saved.content[language];
    assert.ok(content.body);
    for (const mode of ['document', 'slides'] as const) {
      const pageId = await appendGrammarFocusWorkspacePage({ courseId: fixture.courseId, workbookId: 1, lessonId: fixture.lessonId,
        grammarDocumentId: grammarFocusDocumentId(fixture.courseId, 1, fixture.lessonId), classId: 'grammar-upgrade', mode,
        title: content.title, markdown: content.body, lessonNumber: 1, userId: user.uid, userName: 'Admin' });
      const workspace = (await adminDb.doc('liveClasses/grammar-upgrade/shared/workspace').get()).data()!;
      const page = workspace.pages.find((value: any) => value.id === pageId);
      assert.equal(page.grammarSource.courseId, fixture.courseId);
      assert.equal(page.grammarSource.documentId, grammarFocusDocumentId(fixture.courseId, 1, fixture.lessonId));
      assert.match(JSON.stringify(page), /Preserved/);
    }
  }
  console.log('Board and Slides: actual workspace writes from all three migrated curricula passed.');

  const existing = (await adminDb.doc('grammarFocus/english__wb1_l1').get()).data();
  // Unassigned source colliding with an existing official destination is blocked.
  const collision = oldDocument('wb1_l1', 'en');
  await adminDb.doc('grammarFocus/wb1_en_wb1_l1').set(collision);
  await assert.rejects(assignLegacyGrammarFocus({ source: readLegacyGrammarFocus('wb1_en_wb1_l1', collision), courseId: 'english', workbookId: 1, lessonId: 'wb1_l1', updatedBy: user.uid }), /Destination already exists/);
  assert.deepEqual((await adminDb.doc('grammarFocus/english__wb1_l1').get()).data(), existing);

  // Concurrent attempts cannot duplicate one ambiguous source between two curricula.
  const raceData = oldDocument('wb1_l2', 'en');
  await adminDb.doc('grammarFocus/wb1_l2').set(raceData);
  const raceSource = (await readLegacy('wb1_l2'))[0];
  const results = await Promise.allSettled(['english', 'spanish'].map(courseId => assignLegacyGrammarFocus({ source: raceSource, courseId, workbookId: 1, lessonId: 'wb1_l2', updatedBy: user.uid })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const destinations = await Promise.all(['english', 'spanish'].map(course => adminDb.doc(`grammarFocus/${course}__wb1_l2`).get()));
  assert.equal(destinations.filter(snapshot => snapshot.exists).length, 1);

  const staleData = oldDocument('wb1_l3', 'en');
  await adminDb.doc('grammarFocus/wb1_l3').set(staleData);
  const staleSource = (await readLegacy('wb1_l3'))[0];
  await adminDb.doc('grammarFocus/wb1_l3').update({ updatedBy: 'external-maintenance' });
  await assert.rejects(assignLegacyGrammarFocus({ source: staleSource, courseId: 'english', workbookId: 1, lessonId: 'wb1_l3', updatedBy: user.uid }), /source changed/);
  assert.equal((await adminDb.doc('grammarFocus/english__wb1_l3').get()).exists, false);

  // Direct client attempts must also respect immutability and atomicity in Rules.
  await assert.rejects(setDoc(doc(db, 'grammarFocus', 'wb1_l1'), { ...originals.get('wb1_l1'), updatedAt: serverTimestamp(), updatedBy: user.uid }));
  await assert.rejects(deleteDoc(doc(db, 'grammarFocus', 'wb1_l1')));
  await assert.rejects(deleteDoc(doc(db, 'grammarFocus', 'english__wb1_l1')));
  await assert.rejects(deleteDoc(doc(db, 'grammarFocusLegacyAssignments', 'wb1_l1')));
  const receiptRef = doc(db, 'grammarFocusLegacyAssignments', 'wb1_l1');
  const receipt = (await getDoc(receiptRef)).data()!;
  await assert.rejects(setDoc(receiptRef, { ...receipt, courseId: 'spanish' }));
  const forgedSource = oldDocument('es_wb1_l4', 'es');
  await adminDb.doc('grammarFocus/wb1_es_wb1_l4').set(forgedSource);
  await assert.rejects(runTransaction(db, async transaction => {
    transaction.set(doc(db, 'grammarFocus', 'english__wb1_l4'), {
      courseId: 'english', targetLanguage: 'en', workbookId: 1, lessonId: 'wb1_l4', schemaVersion: 2,
      content: forgedSource.content, updatedAt: serverTimestamp(), updatedBy: user.uid, legacySourceId: 'wb1_es_wb1_l4',
    });
    transaction.set(doc(db, 'grammarFocusLegacyAssignments', 'wb1_es_wb1_l4'), {
      sourceId: 'wb1_es_wb1_l4', destinationId: 'english__wb1_l4', courseId: 'english', sourceData: forgedSource,
      content: forgedSource.content, assignedAt: serverTimestamp(), assignedBy: user.uid,
    });
  }));
  assert.equal((await adminDb.doc('grammarFocus/english__wb1_l4').get()).exists, false);
  // Normal editing after migration retains its provenance.
  await saveGrammarFocus({ courseId: 'english', workbookId: 1, lessonId: 'wb1_l1', updatedBy: user.uid,
    content: { ...emptyGrammarFocusContent(), pt: { title: 'Apoio', body: 'Novo apoio' } } });
  assert.equal((await adminDb.doc('grammarFocus/english__wb1_l1').get()).data()!.legacySourceId, 'wb1_l1');

  await signOut(auth);
  const student = await signInAnonymously(auth);
  await adminDb.doc(`users/${student.user.uid}`).set({ role: 'student' });
  const available = await readLegacy('wb1_l3');
  assert.equal(available.length, 1, 'unassigned legacy remains readable by learners');
  await assert.rejects(assignLegacyGrammarFocus({ source: available[0], courseId: 'english', workbookId: 1, lessonId: 'wb1_l3', updatedBy: student.user.uid }));
  assert.equal((await adminDb.doc('grammarFocus/english__wb1_l3').get()).exists, false);
  for (const [id, original] of originals) {
    assert.deepEqual((await adminDb.doc(`grammarFocus/${id}`).get()).data(), original, `source ${id} must remain byte-for-byte equivalent`);
    assert.deepEqual((await adminDb.doc(`grammarFocusLegacyAssignments/${id}`).get()).data()!.sourceData, original);
  }
  console.log('Guards passed: existing destination, concurrent duplicate assignment, stale review, wrong course, source/receipt deletion, student writes. All original fields preserved.');
} finally {
  await signOut(auth); await terminate(db); await deleteApp(adminApp);
}
