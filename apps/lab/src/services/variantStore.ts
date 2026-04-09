import type { MultiVariantLesson, LessonVariant } from '../types';

const STORAGE_KEY = 'lab_lesson_variants';

export function loadVariantLessons(): MultiVariantLesson[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveVariantLesson(lesson: MultiVariantLesson): void {
  const all = loadVariantLessons();
  const idx = all.findIndex((l) => l.id === lesson.id);
  if (idx >= 0) {
    all[idx] = lesson;
  } else {
    all.push(lesson);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteVariantLesson(id: string): void {
  const updated = loadVariantLessons().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/** Update a single variant's status (e.g., mark as 'reviewed'). */
export function updateVariantStatus(
  lessonId: string,
  variantId: string,
  status: LessonVariant['status'],
): void {
  const all = loadVariantLessons();
  const lesson = all.find((l) => l.id === lessonId);
  if (!lesson) return;
  const v = lesson.variants.find((v) => v.id === variantId);
  if (v) v.status = status;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
