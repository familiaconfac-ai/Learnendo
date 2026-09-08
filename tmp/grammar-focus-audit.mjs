// Read-only audit: explicit projectId, full-collection scan (no hardcoded lesson list —
// a substring/allow-list filter previously undercounted migrated lessons).
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'learnendo-6f4d3';
const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(app);
console.log(`Querying Firestore projectId: ${db.projectId}`);

function wb1LessonNumber(value) {
  const match = /wb1_l(\d+)/.exec(String(value ?? ''));
  return match ? Number(match[1]) : null;
}

const focusSnap = await db.collection('grammarFocus').get();
const wb1Canonical = focusSnap.docs
  .filter((d) => d.id.startsWith('english__wb1_'))
  .map((d) => {
    const data = d.data();
    const langs = ['en', 'pt', 'es'].filter((l) => data.content?.[l]?.title?.trim() || data.content?.[l]?.body?.trim());
    return { id: d.id, schemaVersion: data.schemaVersion, courseId: data.courseId, targetLanguage: data.targetLanguage, lessonId: data.lessonId, languagesWithContent: langs };
  })
  .sort((a, b) => (wb1LessonNumber(a.id) ?? 0) - (wb1LessonNumber(b.id) ?? 0));

console.log(`\n== grammarFocus docs starting with "english__wb1_" (${wb1Canonical.length}) ==`);
wb1Canonical.forEach((d) => console.log(JSON.stringify(d)));

const canonicalAnyCourse = focusSnap.docs.filter((d) => d.id.includes('__')).length;
const legacyCount = focusSnap.docs.length - canonicalAnyCourse;
console.log(`\nTotal grammarFocus docs in collection: ${focusSnap.size} (canonical any-course: ${canonicalAnyCourse}, legacy: ${legacyCount})`);

const assignmentsSnap = await db.collection('grammarFocusLegacyAssignments').get();
const wb1Receipts = assignmentsSnap.docs
  .map((d) => ({ sourceId: d.id, ...d.data() }))
  .filter((r) => {
    const n = wb1LessonNumber(r.sourceId) ?? wb1LessonNumber(r.destinationId);
    return n !== null && n >= 1 && n <= 12;
  })
  .sort((a, b) => (wb1LessonNumber(a.sourceId) ?? wb1LessonNumber(a.destinationId) ?? 0) - (wb1LessonNumber(b.sourceId) ?? wb1LessonNumber(b.destinationId) ?? 0));

console.log(`\n== grammarFocusLegacyAssignments receipts touching wb1_l1..wb1_l12 (${wb1Receipts.length}) ==`);
wb1Receipts.forEach((r) => console.log(JSON.stringify({ sourceId: r.sourceId, destinationId: r.destinationId, courseId: r.courseId, assignedBy: r.assignedBy })));

console.log(`\nTotals: canonical(english__wb1_*)=${wb1Canonical.length}, total grammarFocus=${focusSnap.size}, total legacyAssignments=${assignmentsSnap.size}, wb1(l1-l12) receipts=${wb1Receipts.length}`);
