export const MAX_EXERCISE_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function validateExerciseImageFile(file: { type: string; size: number }): 'png' | 'jpg' | 'webp' {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Use uma imagem PNG, JPG/JPEG ou WEBP.');
  if (file.size > MAX_EXERCISE_IMAGE_BYTES) throw new Error('A imagem excede o limite de 5 MB.');
  return file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
}
