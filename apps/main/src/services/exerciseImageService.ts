import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import { storage } from './firebase';

export const MAX_EXERCISE_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function uploadExerciseImage(input: {
  file: File; workbookId: number; lessonId: string; exerciseId: string;
  onProgress?: (percent: number) => void;
}): { task: UploadTask; result: Promise<{ imagePath: string; imageUrl: string }> } {
  if (!ALLOWED_TYPES.has(input.file.type)) throw new Error('Use uma imagem PNG, JPG/JPEG ou WEBP.');
  if (input.file.size > MAX_EXERCISE_IMAGE_BYTES) throw new Error('A imagem excede o limite de 5 MB.');
  const extension = input.file.type === 'image/png' ? 'png' : input.file.type === 'image/webp' ? 'webp' : 'jpg';
  const nonce = `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
  const imagePath = `exercise-images/wb${input.workbookId}/${input.lessonId}/${input.exerciseId}/${nonce}.${extension}`;
  const task = uploadBytesResumable(ref(storage, imagePath), input.file, { contentType: input.file.type });
  const result = new Promise<{ imagePath: string; imageUrl: string }>((resolve, reject) => {
    task.on('state_changed', (snapshot) => input.onProgress?.(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, async () => {
      resolve({ imagePath, imageUrl: await getDownloadURL(task.snapshot.ref) });
    });
  });
  return { task, result };
}
