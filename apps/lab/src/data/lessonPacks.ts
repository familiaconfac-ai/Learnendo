/**
 * Central registry of all structured lesson packs.
 *
 * Each entry is a fully hand-crafted LessonPack with:
 *  - vocabulary  (word + translation + type)
 *  - structures  (pattern + pronoun expansion variants)
 *  - items       (ExerciseItem[] covering MC, fill-in, listening, speaking)
 *
 * Add new lessons here as they are authored (from PDF or written directly).
 */
import type { LessonPack } from '../types';
import { EN_LESSON_1_RICH } from './lesson1Rich';

export const LESSON_PACKS: LessonPack[] = [EN_LESSON_1_RICH];
