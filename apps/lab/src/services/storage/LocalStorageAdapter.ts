import type { ILabStorage } from './ILabStorage';
import type { EngagementProfile, LessonPack, RankingEntry } from '../../types';

const ENGAGEMENT_KEY = 'lab_engagement';
const IMPORTED_PACKS_KEY = 'lab_imported_packs';
const RANKING_PREFIX = 'lab_ranking__';

/**
 * Default storage adapter backed by localStorage.
 * Implements ILabStorage synchronously — no network calls.
 */
export class LocalStorageAdapter implements ILabStorage {
  getEngagement(_guestId: string): EngagementProfile | null {
    try {
      const raw = localStorage.getItem(ENGAGEMENT_KEY);
      return raw ? (JSON.parse(raw) as EngagementProfile) : null;
    } catch {
      return null;
    }
  }

  setEngagement(profile: EngagementProfile): void {
    try {
      localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(profile));
    } catch {
      // storage full — silently ignore
    }
  }

  getImportedPacks(): LessonPack[] {
    try {
      return JSON.parse(localStorage.getItem(IMPORTED_PACKS_KEY) ?? '[]') as LessonPack[];
    } catch {
      return [];
    }
  }

  setImportedPacks(packs: LessonPack[]): void {
    try {
      localStorage.setItem(IMPORTED_PACKS_KEY, JSON.stringify(packs));
    } catch {
      // storage full — silently ignore
    }
  }

  getRankingEntries(scope: string): RankingEntry[] {
    try {
      const key = RANKING_PREFIX + scope;
      return JSON.parse(localStorage.getItem(key) ?? '[]') as RankingEntry[];
    } catch {
      return [];
    }
  }

  saveRankingEntry(scope: string, entry: RankingEntry): void {
    try {
      const key = RANKING_PREFIX + scope;
      const entries = this.getRankingEntries(scope);
      const idx = entries.findIndex((e) => e.id === entry.id);
      if (idx >= 0) {
        entries[idx] = entry;
      } else {
        entries.push(entry);
      }
      entries.sort((a, b) => b.stars - a.stars || b.fire - a.fire);
      localStorage.setItem(key, JSON.stringify(entries));
    } catch {
      // storage full — silently ignore
    }
  }
}
