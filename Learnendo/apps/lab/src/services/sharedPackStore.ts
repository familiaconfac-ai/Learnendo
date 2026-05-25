import type { SharedPack, ExerciseItem } from '../types';
import { getSession } from './userSession';

const MY_PACKS_KEY = 'lab_shared_packs';

// ─── Mock public packs ────────────────────────────────────────────────────────

const PACK_EN_BASICS: SharedPack = {
  id: 'pub-en-basics',
  title: 'English Basics',
  description: 'Core vocabulary and phrases for beginners.',
  language: 'en',
  tags: ['beginner', 'vocabulary'],
  author: { id: 'tp-001', name: 'Ana Costa', role: 'verified_editor' },
  visibility: 'public',
  copyCount: 42,
  createdAt: Date.now() - 25 * 86400000,
  updatedAt: Date.now() - 10 * 86400000,
  items: [
    { id: 'pub-en-1', type: 'multiple-choice', prompt: 'What does "apple" mean?', options: ['maçã', 'pera', 'banana', 'uva'], correctAnswer: 'maçã', explanation: '"Apple" = "maçã" in Portuguese.' },
    { id: 'pub-en-2', type: 'multiple-choice', prompt: 'Which word means "house"?', options: ['car', 'house', 'tree', 'dog'], correctAnswer: 'house' },
    { id: 'pub-en-3', type: 'fill-in', prompt: 'The ___ is shining today. (sun)', correctAnswer: 'sun', alternatives: ['Sun'] },
    { id: 'pub-en-4', type: 'true-false', prompt: '"Cat" and "dog" are both animals.', options: ['True', 'False'], correctAnswer: 'True' },
    { id: 'pub-en-5', type: 'multiple-choice', prompt: 'Complete: "Good ___" (morning greeting)', options: ['morning', 'night', 'week', 'lunch'], correctAnswer: 'morning' },
    { id: 'pub-en-6', type: 'fill-in', prompt: 'How do you say "obrigado" in English?', correctAnswer: 'thank you', alternatives: ['thanks', 'Thank you', 'Thanks'] },
    { id: 'pub-en-7', type: 'true-false', prompt: '"Book" is a verb.', options: ['True', 'False'], correctAnswer: 'False', explanation: '"Book" is primarily a noun.' },
    { id: 'pub-en-8', type: 'multiple-choice', prompt: 'What color is the sky on a clear day?', options: ['green', 'red', 'blue', 'yellow'], correctAnswer: 'blue' },
  ],
};

const PACK_NT_BOOKS: SharedPack = {
  id: 'pub-nt-books',
  title: 'New Testament Books',
  description: 'Test your knowledge of New Testament book names and order.',
  language: undefined,
  tags: ['bible', 'new-testament'],
  author: { id: 'tp-003', name: 'Rev. David Levi', role: 'verified_editor' },
  visibility: 'public',
  copyCount: 28,
  createdAt: Date.now() - 50 * 86400000,
  updatedAt: Date.now() - 5 * 86400000,
  items: [
    { id: 'pub-nt-1', type: 'multiple-choice', prompt: 'Which is the first book of the New Testament?', options: ['Mark', 'Matthew', 'Luke', 'John'], correctAnswer: 'Matthew' },
    { id: 'pub-nt-2', type: 'true-false', prompt: 'Romans was written by Paul.', options: ['True', 'False'], correctAnswer: 'True' },
    { id: 'pub-nt-3', type: 'multiple-choice', prompt: 'How many Gospels are in the New Testament?', options: ['3', '4', '5', '6'], correctAnswer: '4' },
    { id: 'pub-nt-4', type: 'fill-in', prompt: 'The last book of the Bible is ___.', correctAnswer: 'Revelation', alternatives: ['revelation', 'Revelations'] },
    { id: 'pub-nt-5', type: 'multiple-choice', prompt: 'Who wrote the book of Acts?', options: ['Paul', 'John', 'Luke', 'Peter'], correctAnswer: 'Luke', explanation: 'Acts was written by Luke as a sequel to his Gospel.' },
    { id: 'pub-nt-6', type: 'true-false', prompt: 'The book of Hebrews names its author clearly.', options: ['True', 'False'], correctAnswer: 'False', explanation: 'The author of Hebrews is unknown.' },
  ],
};

const PACK_PT_STARTERS: SharedPack = {
  id: 'pub-pt-starters',
  title: 'Portuguese Starters',
  description: 'Essential Portuguese phrases for absolute beginners.',
  language: 'pt',
  tags: ['beginner', 'portuguese'],
  author: { id: 'tp-001', name: 'Ana Costa', role: 'verified_editor' },
  visibility: 'public',
  copyCount: 19,
  createdAt: Date.now() - 15 * 86400000,
  updatedAt: Date.now() - 3 * 86400000,
  items: [
    { id: 'pub-pt-1', type: 'multiple-choice', prompt: 'How do you say "Hello" in Portuguese?', options: ['Olá', 'Tchau', 'Obrigado', 'Bom dia'], correctAnswer: 'Olá' },
    { id: 'pub-pt-2', type: 'fill-in', prompt: 'Bom ___ means "Good morning".', correctAnswer: 'dia', alternatives: ['Dia'] },
    { id: 'pub-pt-3', type: 'multiple-choice', prompt: '"Obrigado" means:', options: ['Hello', 'Goodbye', 'Thank you', 'Please'], correctAnswer: 'Thank you' },
    { id: 'pub-pt-4', type: 'true-false', prompt: '"Boa noite" is used in the morning.', options: ['True', 'False'], correctAnswer: 'False', explanation: '"Boa noite" = Good evening/night.' },
    { id: 'pub-pt-5', type: 'multiple-choice', prompt: 'What does "Tudo bem?" mean?', options: ["What's your name?", 'How are you?', 'Where are you from?', 'I love you'], correctAnswer: 'How are you?' },
    { id: 'pub-pt-6', type: 'fill-in', prompt: '"Por ___" means "Please".', correctAnswer: 'favor', alternatives: ['Favor'] },
  ],
};

const PACK_ES_STARTERS: SharedPack = {
  id: 'pub-es-starters',
  title: 'Spanish Essentials',
  description: 'Key Spanish words and phrases for daily use.',
  language: 'es',
  tags: ['beginner', 'spanish'],
  author: { id: 'tp-002', name: 'Marco Silva', role: 'teacher' },
  visibility: 'public',
  copyCount: 11,
  createdAt: Date.now() - 5 * 86400000,
  updatedAt: Date.now() - 1 * 86400000,
  items: [
    { id: 'pub-es-1', type: 'multiple-choice', prompt: 'How do you say "Good morning" in Spanish?', options: ['Buenos días', 'Buenas noches', 'Buenas tardes', 'Hola'], correctAnswer: 'Buenos días' },
    { id: 'pub-es-2', type: 'fill-in', prompt: '"Gracias" means ___.', correctAnswer: 'thank you', alternatives: ['thanks', 'Thank you'] },
    { id: 'pub-es-3', type: 'true-false', prompt: '"Adiós" means Hello.', options: ['True', 'False'], correctAnswer: 'False', explanation: '"Adiós" means Goodbye.' },
    { id: 'pub-es-4', type: 'multiple-choice', prompt: 'What does "¿Cómo te llamas?" mean?', options: ["What's your name?", 'How are you?', 'Where do you live?', 'How old are you?'], correctAnswer: "What's your name?" },
    { id: 'pub-es-5', type: 'fill-in', prompt: '"Sí" means ___.', correctAnswer: 'yes', alternatives: ['Yes'] },
  ],
};

export const MOCK_PUBLIC_PACKS: SharedPack[] = [
  PACK_EN_BASICS,
  PACK_NT_BOOKS,
  PACK_PT_STARTERS,
  PACK_ES_STARTERS,
];

// ─── My Packs (localStorage) ──────────────────────────────────────────────────

export function getMyPacks(): SharedPack[] {
  try {
    return JSON.parse(localStorage.getItem(MY_PACKS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveMyPacks(packs: SharedPack[]): void {
  localStorage.setItem(MY_PACKS_KEY, JSON.stringify(packs));
}

export function saveMyPack(pack: SharedPack): void {
  const all = getMyPacks();
  const idx = all.findIndex((p) => p.id === pack.id);
  if (idx !== -1) {
    all[idx] = pack;
  } else {
    all.unshift(pack);
  }
  saveMyPacks(all);
}

export function deleteMyPack(id: string): void {
  saveMyPacks(getMyPacks().filter((p) => p.id !== id));
}

/** Returns true if the user already has a copy of this public pack */
export function alreadyCopied(publicPackId: string): boolean {
  return getMyPacks().some((p) => p.copiedFrom?.packId === publicPackId);
}

/**
 * Copies a public pack into My Packs.
 * Creates a new SharedPack with a fresh id, visibility='private', and copiedFrom set.
 */
export function copyPublicPack(original: SharedPack): SharedPack {
  const session = getSession();
  const now = Date.now();
  const copy: SharedPack = {
    ...original,
    id: `my-copy-${original.id}-${now}`,
    visibility: 'private',
    author: { id: session.id, name: session.name, role: session.role },
    copiedFrom: {
      packId: original.id,
      packTitle: original.title,
      authorName: original.author.name,
    },
    createdAt: now,
    updatedAt: now,
    copyCount: undefined,
  };
  saveMyPack(copy);
  return copy;
}

/** Creates a new blank pack owned by the current session and saves it to My Packs. */
export function createMyPack(title: string): SharedPack {
  const session = getSession();
  const now = Date.now();
  const pack: SharedPack = {
    id: `my-${now}`,
    title: title.trim() || 'My Pack',
    description: '',
    items: [],
    author: { id: session.id, name: session.name, role: session.role },
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
  };
  saveMyPack(pack);
  return pack;
}

/** All packs visible in the Public tab (mock list + user's own public packs) */
export function getAllPublicPacks(): SharedPack[] {
  const userPublic = getMyPacks().filter((p) => p.visibility === 'public');
  return [...MOCK_PUBLIC_PACKS, ...userPublic];
}

// ─── One-time migration from the old lab_custom_packs storage key ─────────────

const LEGACY_CUSTOM_KEY = 'lab_custom_packs';

(function migrateCustomPacks() {
  try {
    const raw = localStorage.getItem(LEGACY_CUSTOM_KEY);
    if (!raw) return;
    const customs = JSON.parse(raw) as { id: string; title: string; createdAt: number; items: ExerciseItem[] }[];
    if (!Array.isArray(customs) || customs.length === 0) {
      localStorage.removeItem(LEGACY_CUSTOM_KEY);
      return;
    }
    const session = getSession();
    const existing = getMyPacks();
    const existingIds = new Set(existing.map((p) => p.id));
    let changed = false;
    for (const cp of customs) {
      if (existingIds.has(cp.id)) continue;
      existing.unshift({
        id: cp.id,
        title: cp.title,
        description: '',
        items: cp.items ?? [],
        author: { id: session.id, name: session.name, role: session.role },
        visibility: 'private',
        createdAt: cp.createdAt ?? Date.now(),
        updatedAt: cp.createdAt ?? Date.now(),
      });
      changed = true;
    }
    if (changed) saveMyPacks(existing);
    localStorage.removeItem(LEGACY_CUSTOM_KEY);
  } catch { /* ignore */ }
})();
