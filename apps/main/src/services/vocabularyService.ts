/**
 * vocabularyService.ts
 *
 * Handles vocabulary saving, listing, and deletion (Firestore) plus
 * translation (MyMemory public API).
 *
 * Firestore path:  users/{userId}/vocabulary/{autoId}
 * Firestore rules: already covered by the /users/{uid}/{document=**} match
 *                  which allows isOwner to read/create/update/delete.
 */
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VocabularyEntry {
  text: string;
  translation: string;
  sourceLang: string;
  targetLang: string;
  createdAt: ReturnType<typeof serverTimestamp>;
}

export interface VocabularyEntryDoc {
  id: string;
  text: string;
  translation: string;
  sourceLang: string;
  targetLang: string;
  createdAt: Timestamp | null;
}

function pickTranslation(data: Record<string, any>): string {
  const candidates = [
    data.translation,
    data.meaning,
    data.pt,
    data.translatedText,
    data.translationText,
    data.responseData?.translatedText,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const normalized = candidate.trim();
      if (normalized) return normalized;
    }
  }

  return '';
}

// ── Translation ────────────────────────────────────────────────────────────────

/**
 * Translate `text` from `sourceLang` to `targetLang` using the MyMemory
 * public REST API (no key required for low-volume usage).
 *
 * Returns the translated string, or the original text on failure.
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  if (!text.trim() || sourceLang === targetLang) return text;
  try {
    const langpair = `${sourceLang}|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: { responseData: { translatedText: string }; responseStatus: number } = await res.json();
    if (data.responseStatus !== 200) throw new Error(`API status ${data.responseStatus}`);
    return data.responseData.translatedText || text;
  } catch (err) {
    console.warn('[Vocab] translation failed:', err);
    return text;
  }
}

// ── Firestore save ─────────────────────────────────────────────────────────────

/**
 * Save a vocabulary entry for a user.
 * Returns the new document ID on success, or null on failure.
 */
export async function saveVocabularyEntry(
  userId: string,
  entry: Omit<VocabularyEntry, 'createdAt'>,
): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, 'users', userId, 'vocabulary'), {
      ...entry,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[Vocab] save failed:', err);
    return null;
  }
}

// ── Firestore list ─────────────────────────────────────────────────────────────

/**
 * List all vocabulary entries for a user, newest first.
 */
export async function listVocabularyEntries(userId: string): Promise<VocabularyEntryDoc[]> {
  const q = query(
    collection(db, 'users', userId, 'vocabulary'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, any>;
    return {
      id: d.id,
      text: data.text ?? '',
      translation: pickTranslation(data),
      sourceLang: data.sourceLang ?? 'en',
      targetLang: data.targetLang ?? 'en',
      createdAt: (data.createdAt as Timestamp) ?? null,
    };
  });
}

// ── Firestore delete ───────────────────────────────────────────────────────────

/**
 * Delete a single vocabulary entry.
 */
export async function deleteVocabularyEntry(userId: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'vocabulary', entryId));
}
