/**
 * FirebaseLabAdapter — scaffold for the future Firebase Firestore backend.
 *
 * HOW TO ACTIVATE:
 *   import { setStorage } from './index';
 *   import { initializeApp } from 'firebase/app';
 *   import { getFirestore } from 'firebase/firestore';
 *   import { FirebaseLabAdapter } from './FirebaseLabAdapter';
 *
 *   const app = initializeApp(firebaseConfig);
 *   const db  = getFirestore(app);
 *
 *   // Call once after auth resolves, before any component renders:
 *   setStorage(new FirebaseLabAdapter(db, currentUser.uid));
 *
 * STRATEGY: optimistic local-first writes.
 *   - All reads return from an in-memory cache (populated from Firestore on init).
 *   - Writes update the cache synchronously, then push to Firestore in background.
 *   - This keeps every call synchronous (matching ILabStorage contract) while
 *     still persisting to the cloud.
 *
 * IMPORTANT: This file intentionally avoids importing firebase/* to keep the
 * build size zero until Firebase is wired. Replace the `db: unknown` type with
 * `Firestore` from 'firebase/firestore' when activating.
 */

import type { ILabStorage } from './ILabStorage';
import type { EngagementProfile, LessonPack, RankingEntry } from '../../types';

// ─── Firestore paths ──────────────────────────────────────────────────────────
//
// Document layout in Firestore:
//
//   users/{userId}/engagement          — single document: EngagementProfile
//   users/{userId}/importedPacks       — array field: LessonPack[]
//   rankings/{scope}/entries/{userId}  — sub-collection: RankingEntry per user
//
// 'scope' examples: 'global', 'lang:en', 'class:abc123'
//
// ─────────────────────────────────────────────────────────────────────────────

export class FirebaseLabAdapter implements ILabStorage {
  // TODO: Replace `unknown` with `import('firebase/firestore').Firestore`
  private readonly db: unknown;
  private readonly userId: string;

  // In-memory cache — populated on init from Firestore, kept in sync on writes
  private engagementCache: EngagementProfile | null = null;
  private importedPacksCache: LessonPack[] | null = null;
  private rankingCache = new Map<string, RankingEntry[]>();

  constructor(db: unknown, userId: string) {
    this.db = db;
    this.userId = userId;
    // TODO: call this.hydrate() to pre-load all data from Firestore on mount
  }

  // ── Engagement ─────────────────────────────────────────────────────────────

  getEngagement(_guestId: string): EngagementProfile | null {
    // Returns from cache; hydrate() populates this from Firestore on init
    return this.engagementCache;
  }

  setEngagement(profile: EngagementProfile): void {
    this.engagementCache = profile;
    // TODO: push to Firestore:
    //   setDoc(doc(this.db, 'users', this.userId, 'engagement', 'data'), profile)
    //     .catch(console.error);
  }

  // ── Imported packs ─────────────────────────────────────────────────────────

  getImportedPacks(): LessonPack[] {
    return this.importedPacksCache ?? [];
  }

  setImportedPacks(packs: LessonPack[]): void {
    this.importedPacksCache = packs;
    // TODO: push to Firestore:
    //   setDoc(doc(this.db, 'users', this.userId, 'packs', 'imported'), { packs })
    //     .catch(console.error);
  }

  // ── Ranking ────────────────────────────────────────────────────────────────

  getRankingEntries(scope: string): RankingEntry[] {
    return this.rankingCache.get(scope) ?? [];
  }

  saveRankingEntry(scope: string, entry: RankingEntry): void {
    const entries = this.getRankingEntries(scope).filter((e) => e.id !== entry.id);
    const updated = [...entries, entry].sort((a, b) => b.stars - a.stars || b.fire - a.fire);
    this.rankingCache.set(scope, updated);
    // TODO: push to Firestore:
    //   setDoc(doc(this.db, 'rankings', scope, 'entries', this.userId), entry)
    //     .catch(console.error);
  }

  // ── Internal: initial hydration ────────────────────────────────────────────

  /**
   * Load all user data from Firestore into the in-memory cache.
   * Returns a Promise so callers can await before first render if needed.
   *
   * TODO: implement with:
   *   const engDoc  = await getDoc(doc(this.db, 'users', this.userId, 'engagement', 'data'));
   *   if (engDoc.exists()) this.engagementCache = engDoc.data() as EngagementProfile;
   *
   *   const packsDoc = await getDoc(doc(this.db, 'users', this.userId, 'packs', 'imported'));
   *   if (packsDoc.exists()) this.importedPacksCache = (packsDoc.data() as { packs: LessonPack[] }).packs;
   *
   *   // Optionally preload ranking scopes: 'global', 'lang:en', etc.
   */
  async hydrate(): Promise<void> {
    // TODO: implement hydration from Firestore
    console.warn('FirebaseLabAdapter.hydrate() not yet implemented — using empty cache');
  }
}
