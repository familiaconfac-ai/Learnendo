import assert from 'node:assert/strict';
import { deleteApp as deleteClientApp } from 'firebase/app';
import { signInAnonymously, signOut } from 'firebase/auth';
import { getDoc, doc, terminate } from 'firebase/firestore';
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { auth, db, firebaseRuntimeConfig } from '../src/services/firebase';
import { saveExerciseDraft, publishExerciseOverride } from '../src/services/exerciseOverrideService';
import { exactExerciseReportProblemKey } from '../src/services/exerciseReportStatus';
import { resolveReportedExerciseIdentity } from '../src/utils/exerciseReportCurriculum';
import { workbook1 as en } from '../src/data/workbook1/index';
import { workbook1 as es } from '../src/courses/spanish/workbook1';
import { workbook1 as pt } from '../src/courses/portuguese_foreigners/workbook1';

// The runner replaces only Firebase initialization with a demo emulator connection.
// Identity resolution, authorization, validation and both transactions are production code.
const adminApp = initializeAdminApp({ projectId: firebaseRuntimeConfig.projectId }, 'editor-integration');
const adminDb = getAdminFirestore(adminApp);
try {
  const { user } = await signInAnonymously(auth);
  await adminDb.doc(`users/${user.uid}`).set({ role: 'admin' });
  for (const [language, workbook] of Object.entries({ en, es, pt })) {
    const lesson = workbook.lessons[0];
    const original = lesson.days.flatMap((day) => day.exercises).find((exercise) => language === 'en'
      ? exercise.id === 'wb1_l1_letter_recognition_r'
      : exercise.id === `${language}_wb1_l1_d1_e9`)!;
    assert.ok(original, `Missing ${language} curriculum fixture`);
    const day = lesson.days.find((day) => day.exercises.includes(original))!;
    const location = { workbook, lesson, day, exerciseIndex: day.exercises.indexOf(original) };
    const report = {
      reportId: `editor-${language}-${user.uid}`, workbookId: 1,
      exerciseId: original.id, language, status: 'new' as const, userId: user.uid,
      createdAt: new Date(), priority: 'normal',
      problemCategory: 'Áudio incorreto', studentComment: '', adminNote: '',
      instruction: original.instruction, audioText: original.audioValue ?? null,
      options: original.options ?? [], expectedAnswer: original.correctValue,
    };
    await adminDb.doc(`exerciseReports/${report.reportId}`).set(report);
    const identity = resolveReportedExerciseIdentity(location, report, language);
    assert.ok(identity);
    assert.equal(identity.workbookId, 1);
    const fields = { instruction: `${original.instruction} (editor test)` };
    const input = {
      original, identity, fields, changeReason: 'Teste local da identificação do livro no editor.',
      adminNote: '', updatedBy: user.uid, baseVersion: 0, relatedReportId: report.reportId,
    };
    const revision = await saveExerciseDraft(input);
    assert.equal(revision, 1);
    const draft = await getDoc(doc(db, 'exerciseDrafts', original.id));
    assert.equal(draft.data()?.workbookId, 1);
    assert.equal(draft.data()?.language, language);
    assert.equal((await getDoc(doc(db, 'exerciseReports', report.reportId))).data()?.status, 'new');
    const version = await publishExerciseOverride({
      ...input, expectedDraftRevision: revision,
      reportToResolve: { ...report, duplicateKey: exactExerciseReportProblemKey(report), exactDuplicates: [] },
    });
    assert.equal(version, 1);
    for (const path of [`exerciseOverrides/${original.id}`, `publishedExerciseOverrides/${original.id}`, `exerciseOverrides/${original.id}/versions/000001`]) {
      const saved = (await getDoc(doc(db, path))).data();
      assert.equal(saved?.workbookId, 1, path);
      assert.equal(saved?.lessonId, lesson.id, path);
      assert.equal(saved?.dayId, day.id, path);
      assert.equal(saved?.language, language, path);
      assert.equal(saved?.override.instruction, fields.instruction, path);
    }
    const resolved = (await getDoc(doc(db, 'exerciseReports', report.reportId))).data();
    assert.equal(resolved?.status, 'resolved');
    assert.equal(resolved?.resolutionVersion, version);
    assert.equal(resolved?.resolutionType, 'editorial');
    assert.equal((await getDoc(doc(db, 'exerciseDrafts', original.id))).exists(), false);
    console.log(`PASS ${language}: ${original.id}, workbookId=1, draft saved, version=${version}, report resolved`);
  }
} finally {
  await signOut(auth);
  await terminate(db);
  await deleteClientApp(auth.app);
  await deleteAdminApp(adminApp);
}
