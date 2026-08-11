import { FieldValue, type Query } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from './firebaseAdmin.js';
import { canDeleteOwnedBattleTemplate, removeStudentFromRoster, removeUidFromRecord, USER_OWNED_SUBCOLLECTIONS } from './studentDeletionSchema.js';

export interface StudentDeletionIssue {
  scope: string;
  message: string;
}

export interface StudentDeletionResult {
  uid: string;
  completed: boolean;
  auth: 'deleted' | 'not-found' | 'failed';
  deletedDocuments: number;
  updatedSharedDocuments: number;
  cleanup: Record<string, number>;
  issues: StudentDeletionIssue[];
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason);
}

async function deleteQuery(query: Query, scope: string, result: StudentDeletionResult) {
  let deleted = 0;
  while (true) {
    const snapshot = await query.limit(400).get();
    if (snapshot.empty) break;
    const batch = adminDb.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < 400) break;
  }
  result.deletedDocuments += deleted;
  result.cleanup[scope] = (result.cleanup[scope] ?? 0) + deleted;
}

async function runCleanupStep(result: StudentDeletionResult, scope: string, work: () => Promise<void>) {
  try {
    await work();
  } catch (reason) {
    result.issues.push({ scope, message: errorMessage(reason) });
  }
}

async function cleanupBattleTemplates(uid: string, result: StudentDeletionResult) {
  const snapshot = await adminDb.collection('battleTemplates').where('createdBy', '==', uid).get();
  const privateTemplates = snapshot.docs.filter((document) => canDeleteOwnedBattleTemplate(document.data()));
  const sharedTemplates = snapshot.size - privateTemplates.length;
  for (let index = 0; index < privateTemplates.length; index += 400) {
    const batch = adminDb.batch();
    privateTemplates.slice(index, index + 400).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
  result.deletedDocuments += privateTemplates.length;
  result.cleanup.battleTemplates = privateTemplates.length;
  if (sharedTemplates > 0) result.cleanup.sharedBattleTemplatesPreserved = sharedTemplates;
}

async function cleanupGroups(uid: string, result: StudentDeletionResult) {
  const groups = await adminDb.collection('liveClassGroups').get();
  for (const group of groups.docs) {
    await runCleanupStep(result, group.ref.path, async () => {
      const roster = removeStudentFromRoster(group.data(), uid);
      if (!roster.changed) return;
      await group.ref.update({
        assignedStudentIds: roster.assignedStudentIds,
        assignedStudentNames: roster.assignedStudentNames,
        updatedAt: FieldValue.serverTimestamp(),
      });
      result.updatedSharedDocuments += 1;
      result.cleanup.liveClassGroups = (result.cleanup.liveClassGroups ?? 0) + 1;
    });
  }
}

async function cleanupLiveClasses(uid: string, result: StudentDeletionResult) {
  const classes = await adminDb.collection('liveClasses').get();
  for (const liveClass of classes.docs) {
    await runCleanupStep(result, `${liveClass.ref.path}.roster`, async () => {
      const roster = removeStudentFromRoster(liveClass.data(), uid);
      if (!roster.changed) return;
      await liveClass.ref.update({
        assignedStudentIds: roster.assignedStudentIds,
        assignedStudentNames: roster.assignedStudentNames,
        updatedAt: FieldValue.serverTimestamp(),
      });
      result.updatedSharedDocuments += 1;
      result.cleanup.liveClassRosters = (result.cleanup.liveClassRosters ?? 0) + 1;
    });

    await runCleanupStep(result, `${liveClass.ref.path}.presence`, async () => {
      const presenceRef = liveClass.ref.collection('presence').doc(uid);
      if (!(await presenceRef.get()).exists) return;
      await presenceRef.delete();
      result.deletedDocuments += 1;
      result.cleanup.liveClassPresence = (result.cleanup.liveClassPresence ?? 0) + 1;
    });
    await runCleanupStep(result, `${liveClass.ref.path}.responses`, () =>
      deleteQuery(liveClass.ref.collection('responses').where('userId', '==', uid), 'liveClassResponses', result));
    await runCleanupStep(result, `${liveClass.ref.path}.messages`, () =>
      deleteQuery(liveClass.ref.collection('messages').where('senderUid', '==', uid), 'liveClassMessages', result));

    await runCleanupStep(result, `${liveClass.ref.path}.exerciseBlocks`, async () => {
      const blocks = await liveClass.ref.collection('exerciseBlocks').get();
      for (const block of blocks.docs) {
        const data = block.data();
        const update: Record<string, unknown> = {};
        for (const field of ['responses', 'responseStatuses', 'responseLocks', 'responseAttempts', 'responseVerdicts', 'responseAnsweredAt']) {
          const stripped = removeUidFromRecord(data[field], uid);
          if (stripped.changed) update[field] = stripped.value;
        }
        if (!Object.keys(update).length) continue;
        update.updatedAt = FieldValue.serverTimestamp();
        await block.ref.update(update);
        result.updatedSharedDocuments += 1;
        result.cleanup.liveExerciseBlocks = (result.cleanup.liveExerciseBlocks ?? 0) + 1;
      }
    });

    await runCleanupStep(result, `${liveClass.ref.path}.battle`, async () => {
      const battleRef = liveClass.ref.collection('session').doc('battle');
      const battle = await battleRef.get();
      if (!battle.exists) return;
      const data = battle.data() ?? {};
      const update: Record<string, unknown> = {};
      for (const field of ['participants', 'scores', 'answers', 'currentAnswers']) {
        const stripped = removeUidFromRecord(data[field], uid);
        if (stripped.changed) update[field] = stripped.value;
      }
      if (Array.isArray(data.roundParticipantIds) && data.roundParticipantIds.includes(uid)) {
        update.roundParticipantIds = data.roundParticipantIds.filter((id: unknown) => id !== uid);
      }
      if (!Object.keys(update).length) return;
      update.updatedAt = Date.now();
      await battleRef.update(update);
      result.updatedSharedDocuments += 1;
      result.cleanup.liveBattleSessions = (result.cleanup.liveBattleSessions ?? 0) + 1;
    });
  }
}

export async function deleteStudentData(uid: string): Promise<StudentDeletionResult> {
  const result: StudentDeletionResult = {
    uid,
    completed: false,
    auth: 'failed',
    deletedDocuments: 0,
    updatedSharedDocuments: 0,
    cleanup: {},
    issues: [],
  };

  // Revoke access before touching data. If deletion later becomes partial, the
  // account cannot sign in and recreate student-owned documents meanwhile.
  let authExists = true;
  try {
    await adminAuth.updateUser(uid, { disabled: true });
  } catch (reason) {
    if ((reason as { code?: string }).code === 'auth/user-not-found') {
      authExists = false;
      result.auth = 'not-found';
    } else {
      result.issues.push({ scope: 'authentication.disable', message: errorMessage(reason) });
      return result;
    }
  }

  for (const collectionName of USER_OWNED_SUBCOLLECTIONS) {
    await runCleanupStep(result, `users/${uid}/${collectionName}`, async () => {
      await deleteQuery(adminDb.doc(`users/${uid}`).collection(collectionName), `users.${collectionName}`, result);
    });
  }

  await runCleanupStep(result, `users/${uid}`, async () => {
    const reference = adminDb.doc(`users/${uid}`);
    if ((await reference.get()).exists) {
      await reference.delete();
      result.deletedDocuments += 1;
      result.cleanup.userDocument = 1;
    }
  });
  for (const path of [`progress/${uid}`, `debug_test/${uid}`]) {
    await runCleanupStep(result, path, async () => {
      const reference = adminDb.doc(path);
      if ((await reference.get()).exists) {
        await reference.delete();
        result.deletedDocuments += 1;
        result.cleanup[path.split('/')[0]] = 1;
      }
    });
  }
  await runCleanupStep(result, 'exerciseReports', async () => {
    await deleteQuery(adminDb.collection('exerciseReports').where('userId', '==', uid), 'exerciseReports', result);
  });
  await runCleanupStep(result, 'materials', async () => {
    await deleteQuery(adminDb.collection('materials').where('createdBy', '==', uid), 'materials', result);
  });
  await runCleanupStep(result, 'battleTemplates', () => cleanupBattleTemplates(uid, result));
  await runCleanupStep(result, 'liveClassGroups', () => cleanupGroups(uid, result));
  await runCleanupStep(result, 'liveClasses', () => cleanupLiveClasses(uid, result));

  if (authExists) {
    try {
      await adminAuth.deleteUser(uid);
      result.auth = 'deleted';
    } catch (reason) {
      if ((reason as { code?: string }).code === 'auth/user-not-found') {
        result.auth = 'not-found';
      } else {
        result.auth = 'failed';
        result.issues.push({ scope: 'authentication', message: errorMessage(reason) });
      }
    }
  }

  result.completed = result.issues.length === 0;
  return result;
}
