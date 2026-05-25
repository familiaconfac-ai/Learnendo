/**
 * Storage contract for the core lab data.
 *
 * Current implementation: localStorage (synchronous, offline-first).
 * Future implementation: Firebase Firestore.
 *   The Firebase adapter keeps a local cache so all reads stay synchronous;
 *   writes are optimistic (local-first) and sync to Firestore in the background.
 *
 * Usage:
 *   import { getStorage, setStorage } from './index';
 *
 *   // Switch to Firebase (call once at app boot after auth resolves):
 *   setStorage(new FirebaseLabAdapter(db, userId));
 */
import type { EngagementProfile, LessonPack, RankingEntry } from '../../types';

export interface ILabStorage {
  // ── Engagement / progress ─────────────────────────────────────────────────

  /**
   * Load the engagement profile for a given guest ID.
   * Returns null if no profile exists yet.
   */
  getEngagement(guestId: string): EngagementProfile | null;

  /** Persist an updated engagement profile. */
  setEngagement(profile: EngagementProfile): void;

  // ── Imported lesson packs ─────────────────────────────────────────────────

  /** Load all packs imported via the PDF wizard. */
  getImportedPacks(): LessonPack[];

  /** Replace the full list of imported packs. */
  setImportedPacks(packs: LessonPack[]): void;

  // ── Ranking ────────────────────────────────────────────────────────────────
  // Scope is a string key such as 'global', 'class:abc', or 'lang:en'.
  // This boundary allows Firebase to later scope rankings per user group.

  /**
   * Load ranking entries for the given scope.
   * Returns an array sorted by stars descending (best effort).
   */
  getRankingEntries(scope: string): RankingEntry[];

  /**
   * Upsert (insert or update) a ranking entry for the given scope.
   * Implementations must deduplicate by entry.id.
   */
  saveRankingEntry(scope: string, entry: RankingEntry): void;
}
