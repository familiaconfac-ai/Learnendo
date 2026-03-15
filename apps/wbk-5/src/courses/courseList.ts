import { Course } from '../types';

export const COURSES: Course[] = [
  // ── Modern Languages ──────────────────────────────────────────────────────
  {
    id: 'english',
    title: 'English',
    flag: '🇺🇸',
    category: 'modern',
    description: 'Learn English from A1 to B2',
  },
  {
    id: 'spanish',
    title: 'Spanish',
    flag: '🇪🇸',
    category: 'modern',
    description: 'Learn Spanish — coming soon',
  },
  {
    id: 'portuguese_native',
    title: 'Portuguese Grammar',
    flag: '🇧🇷',
    category: 'modern',
    description: 'Grammar for native speakers — coming soon',
  },
  {
    id: 'portuguese_foreigners',
    title: 'Portuguese for Foreigners',
    flag: '🇧🇷',
    category: 'modern',
    description: 'Learn Brazilian Portuguese — coming soon',
  },
  // ── Biblical Languages ────────────────────────────────────────────────────
  {
    id: 'greek_koine',
    title: 'Biblical Greek (Koine)',
    flag: '🇬🇷',
    category: 'biblical',
    description: 'Read the New Testament in the original Greek',
  },
  {
    id: 'hebrew_biblical',
    title: 'Biblical Hebrew',
    flag: '🇮🇱',
    category: 'biblical',
    description: 'Read the Old Testament in classical Hebrew',
  },
  // ── Special Study Track ───────────────────────────────────────────────────
  {
    id: 'bible_language_track',
    title: 'Bible Language Track',
    flag: '📖',
    category: 'track',
    description: 'Combined Greek + Hebrew study path',
  },
];
