import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import { storage } from './firebase';
import { validateExerciseImageFile } from './exerciseImageValidation';

export const EXERCISE_IMAGE_START_TIMEOUT_MS = 20_000;
export const EXERCISE_IMAGE_PROGRESS_TIMEOUT_MS = 30_000;

type UploadError = Error & { code?: string };

function stalledUploadError(): UploadError {
  const error = new Error('O upload não enviou dados dentro do tempo esperado.') as UploadError;
  error.code = 'storage/upload-stalled';
  return error;
}

export function uploadExerciseImage(input: {
  file: File; workbookId: number; lessonId: string; exerciseId: string;
  onProgress?: (percent: number) => void;
}): { task: UploadTask; imagePath: string; result: Promise<{ imagePath: string; imageUrl: string }> } {
  const extension = validateExerciseImageFile(input.file);
  const nonce = `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
  const imagePath = `exercise-images/wb${input.workbookId}/${input.lessonId}/${input.exerciseId}/${nonce}.${extension}`;
  const task = uploadBytesResumable(ref(storage, imagePath), input.file, { contentType: input.file.type });
  const result = new Promise<{ imagePath: string; imageUrl: string }>((resolve, reject) => {
    let settled = false;
    let stalled = false;
    let lastBytes = 0;
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    const clearWatchdog = () => { if (watchdog) clearTimeout(watchdog); watchdog = null; };
    const armWatchdog = (timeoutMs: number) => {
      clearWatchdog();
      watchdog = setTimeout(() => {
        if (settled) return;
        stalled = true;
        task.cancel();
      }, timeoutMs);
    };
    armWatchdog(EXERCISE_IMAGE_START_TIMEOUT_MS);
    task.on('state_changed', (snapshot) => {
      const percent = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100);
      input.onProgress?.(percent);
      if (snapshot.bytesTransferred > lastBytes) {
        lastBytes = snapshot.bytesTransferred;
        armWatchdog(EXERCISE_IMAGE_PROGRESS_TIMEOUT_MS);
      }
    }, (error) => {
      settled = true;
      clearWatchdog();
      reject(stalled ? stalledUploadError() : error);
    }, async () => {
      settled = true;
      clearWatchdog();
      try {
        resolve({ imagePath, imageUrl: await getDownloadURL(task.snapshot.ref) });
      } catch (error) {
        reject(error);
      }
    });
  });
  return { task, imagePath, result };
}
