import assert from 'node:assert/strict';
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, terminate } from 'firebase/firestore';
import { auth, db, firebaseRuntimeConfig } from '../src/services/firebase';
import { saveGrammarFocus, subscribeGrammarFocus, subscribeLegacyGrammarFocus } from '../src/services/grammarFocusService';
import { emptyGrammarFocusContent, grammarFocusDocumentId } from '../src/models/grammarFocus';
import { COURSE_TARGET_LANGUAGE } from '../src/models/languageContext';
import { appendGrammarFocusWorkspacePage } from '../src/services/grammarFocusWorkspace';

function firstSnapshot<T>(subscribe: (done: (value: T) => void, fail: (error: Error) => void) => () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => { unsubscribe(); reject(new Error('Snapshot timeout')); }, 10000);
    unsubscribe = subscribe(value => { clearTimeout(timeout); unsubscribe(); resolve(value); }, error => { clearTimeout(timeout); unsubscribe(); reject(error); });
  });
}

const adminApp = initializeAdminApp({ projectId: firebaseRuntimeConfig.projectId }, 'language-integrity');
const adminDb = getAdminFirestore(adminApp);
try {
  const { user } = await signInAnonymously(auth);
  await adminDb.doc(`users/${user.uid}`).set({ role: 'admin' });
  const legacy = { workbookId: 1, lessonId: 'wb1_l1', schemaVersion: 1,
    content: { ...emptyGrammarFocusContent(), en: { title: 'Unassigned history', body: 'Keep this verbatim.' } } };
  await adminDb.doc('grammarFocus/wb1_l1').set(legacy);
  for (const [courseId, targetLanguage] of Object.entries(COURSE_TARGET_LANGUAGE)) {
    assert.equal(await firstSnapshot((done, fail) => subscribeGrammarFocus(courseId, 1, 'wb1_l1', done, fail)), null,
      'unassigned legacy must not become curriculum content');
    const content = { ...emptyGrammarFocusContent(), en: { title: courseId, body: `Target ${targetLanguage}` }, pt: { title: `PT ${courseId}`, body: 'Apoio preservado' } };
    await saveGrammarFocus({ courseId, workbookId: 1, lessonId: 'wb1_l1', content, updatedBy: user.uid });
    const saved: any = await firstSnapshot((done, fail) => subscribeGrammarFocus(courseId, 1, 'wb1_l1', done, fail));
    assert.equal(saved.courseId, courseId);
    assert.equal(saved.targetLanguage, targetLanguage);
    assert.deepEqual(saved.content, content);
    await saveGrammarFocus({ courseId, workbookId: 1, lessonId: 'wb1_l1', content: { ...emptyGrammarFocusContent(), es: { title: 'Apoyo', body: courseId } }, updatedBy: user.uid });
    const read = (await getDoc(doc(db, 'grammarFocus', grammarFocusDocumentId(courseId, 1, 'wb1_l1')))).data()!;
    assert.equal(read.content.en.title, courseId);
    assert.equal(read.content.pt.body, 'Apoio preservado');
    assert.equal(read.content.es.body, courseId);
  }
  assert.deepEqual((await adminDb.doc('grammarFocus/wb1_l1').get()).data(), legacy);
  const legacyPreview: any = await firstSnapshot((done, fail) => subscribeLegacyGrammarFocus(1, 'wb1_l1', done, fail));
  assert.equal(legacyPreview.en.body, 'Keep this verbatim.');

  const englishRef = doc(db, 'grammarFocus', grammarFocusDocumentId('english', 1, 'wb1_l1'));
  const english = (await getDoc(englishRef)).data()!;
  await assert.rejects(setDoc(englishRef, { ...english, courseId: 'spanish', targetLanguage: 'es', updatedAt: serverTimestamp() }));
  await assert.rejects(setDoc(englishRef, { ...english, targetLanguage: 'he', updatedAt: serverTimestamp() }));
  await assert.rejects(setDoc(englishRef, { ...legacy, updatedAt: serverTimestamp(), updatedBy: user.uid }));

  await adminDb.doc('liveClasses/language-test').set({ createdBy: user.uid, teacherUid: user.uid });
  for (const mode of ['document', 'slides'] as const) {
    const source = { courseId: 'spanish', workbookId: 1, lessonId: 'es_wb1_l1', grammarDocumentId: grammarFocusDocumentId('spanish', 1, 'es_wb1_l1') };
    const pageId = await appendGrammarFocusWorkspacePage({ ...source, classId: 'language-test', mode,
      title: 'Gramática', markdown: 'Ejemplo', lessonNumber: 1, userId: user.uid, userName: 'Test' });
    const workspace = (await adminDb.doc('liveClasses/language-test/shared/workspace').get()).data()!;
    assert.deepEqual(workspace.pages.find((page: any) => page.id === pageId).grammarSource,
      { courseId: source.courseId, workbookId: 1, lessonId: source.lessonId, documentId: source.grammarDocumentId });
    await assert.rejects(appendGrammarFocusWorkspacePage({ ...source, grammarDocumentId: 'english__wb1_l1', classId: 'language-test', mode,
      title: 'Wrong', markdown: 'Wrong', lessonNumber: 1, userId: user.uid, userName: 'Test' }));
  }
  await signOut(auth);
  const student = await signInAnonymously(auth);
  await adminDb.doc(`users/${student.user.uid}`).set({ role: 'student' });
  assert.equal((await getDoc(englishRef)).data()?.courseId, 'english');
  await assert.rejects(saveGrammarFocus({ courseId: 'english', workbookId: 1, lessonId: 'wb1_l1', content: emptyGrammarFocusContent(), updatedBy: student.user.uid }));
  console.log('Language integrity: six isolated curricula, legacy preserved, scoped reload/merge, rules and Board/Slides passed.');
} finally {
  await signOut(auth);
  await terminate(db);
  await deleteAdminApp(adminApp);
}
