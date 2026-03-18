/**
 * adminEngine.ts
 *
 * Admin-only operations:
 *   - Reset user progress (by scope)
 *   - Manage group configs
 *
 * These functions NEVER touch:
 *   - /users/{uid}           (profile)
 *   - /users/{uid}/placementTests
 *   - /users/{uid}/meta
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  Language,
  GroupId,
  GroupConfig,
  ResetScope,
  setGroupConfig,
  getGroupConfig,
} from './courseProgressEngine';

// ─────────────────────────────────────────────────────────────
// Reset helpers
// ─────────────────────────────────────────────────────────────

/**
 * Delete all documents in a Firestore subcollection.
 * Firestore does not cascade-delete children, so we do it manually.
 */
async function deleteSubcollection(path: string): Promise<void> {
  if (!db) return;
  const snap = await getDocs(collection(db, path));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  console.log(`[RESET] Deleted ${snap.size} docs from ${path}`);
}

// ─────────────────────────────────────────────────────────────
// resetUserProgress
// ─────────────────────────────────────────────────────────────

/**
 * Reset user progress by scope.
 *
 * 'all'      → clears courseProgress + weeklyProgress for all languages/workbooks
 * 'language' → clears only courseProgress docs for the given language
 * 'workbook' → clears only the specific courseProgress doc
 *
 * NEVER modifies: profile (/users/{uid}), placementTests, meta/status
 */
export async function resetUserProgress(
  uid: string,
  scope: ResetScope,
  opts?: { language?: Language; workbook?: number }
): Promise<void> {
  if (!db) {
    console.error('[RESET] db is null');
    return;
  }

  console.log('[RESET] Starting reset for uid:', uid, '| scope:', scope, '| opts:', opts);

  try {
    if (scope === 'all') {
      // Clear all courseProgress docs
      await deleteSubcollection(`users/${uid}/courseProgress`);
      // Clear legacy weeklyProgress docs
      await deleteSubcollection(`users/${uid}/weeklyProgress`);
      console.log('[RESET] All progress cleared for:', uid);
      return;
    }

    if (scope === 'language') {
      if (!opts?.language) {
        console.error('[RESET] language scope requires opts.language');
        return;
      }
      const cpSnap = await getDocs(collection(db, `users/${uid}/courseProgress`));
      const toDelete = cpSnap.docs.filter(d => d.id.startsWith(`${opts.language}_`));
      await Promise.all(toDelete.map(d => deleteDoc(d.ref)));
      console.log(`[RESET] Cleared ${toDelete.length} docs for language ${opts.language}`);
      return;
    }

    if (scope === 'workbook') {
      if (!opts?.language || opts?.workbook === undefined) {
        console.error('[RESET] workbook scope requires opts.language and opts.workbook');
        return;
      }
      const docId = `${opts.language}_${opts.workbook}`;
      const ref = doc(db, `users/${uid}/courseProgress/${docId}`);
      await deleteDoc(ref);
      console.log(`[RESET] Cleared courseProgress/${docId} for uid:`, uid);
      return;
    }
  } catch (e) {
    console.error('[RESET] resetUserProgress error:', e);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────
// Group management
// ─────────────────────────────────────────────────────────────

export { setGroupConfig, getGroupConfig };

/**
 * Assign a user to a group.
 * Writes to /users/{uid}/meta/status without touching profile.
 */
export async function assignUserToGroup(uid: string, groupId: GroupId): Promise<void> {
  if (!db) return;
  try {
    const ref = doc(db, `users/${uid}/meta/status`);
    await setDoc(ref, { group: groupId }, { merge: true });
    console.log('[RESET] User', uid, 'assigned to group:', groupId);
  } catch (e) {
    console.error('[RESET] assignUserToGroup error:', e);
  }
}

/**
 * Ensure default group configs exist in Firestore.
 * Safe to call multiple times (uses merge).
 */
export async function seedDefaultGroups(): Promise<void> {
  const defaults: GroupConfig[] = [
    { groupId: 'tuesday', name: 'Tuesday Class', startDay: 'tuesday', resetDay: 'monday' },
    { groupId: 'saturday', name: 'Saturday Class', startDay: 'saturday', resetDay: 'friday' },
  ];

  for (const g of defaults) {
    await setGroupConfig(g);
  }
  console.log('[RESET] Default groups seeded.');
}

/**
 * Reset all users belonging to a specific group.
 * Used on the group's resetDay to clear weekly progress.
 */
export async function resetGroupProgress(
  groupId: GroupId,
  scope: ResetScope = 'all',
  opts?: { language?: Language; workbook?: number }
): Promise<void> {
  if (!db) return;

  try {
    console.log('[RESET] Starting group reset. groupId:', groupId, '| scope:', scope);
    const usersSnap = await getDocs(collection(db, 'users'));

    const resets: Promise<void>[] = [];
    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      try {
        const metaRef = doc(db, `users/${uid}/meta/status`);
        const metaSnap = await getDoc(metaRef);
        if (metaSnap.data()?.group === groupId) {
          console.log('[RESET] Resetting user:', uid, 'in group:', groupId);
          resets.push(resetUserProgress(uid, scope, opts));
        }
      } catch {}
    }

    await Promise.all(resets);
    console.log(`[RESET] Group ${groupId} reset complete. Users reset: ${resets.length}`);
  } catch (e) {
    console.error('[RESET] resetGroupProgress error:', e);
  }
}
