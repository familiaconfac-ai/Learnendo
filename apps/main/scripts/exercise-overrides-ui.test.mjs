import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../../', import.meta.url);
const [rules, storageRules, service, editor, practice, dashboard, imageService, accessService, errorService] = await Promise.all([
  readFile(new URL('firestore.rules', root), 'utf8'),
  readFile(new URL('storage.rules', root), 'utf8'),
  readFile(new URL('../src/services/exerciseOverrideService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ProblemReports/ExerciseEditorModal.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ExercisePractice/ExercisePractice.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ProblemReports/ProblemReportsDashboard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/exerciseImageService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/editorialAccessService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/editorialFirebaseError.ts', import.meta.url), 'utf8'),
]);

test('student projection is separate from admin drafts and history', () => {
  assert.match(rules, /match \/publishedExerciseOverrides\/\{exerciseId\}[\s\S]*allow read: if signedIn\(\)/);
  assert.match(rules, /match \/exerciseDrafts\/\{exerciseId\}[\s\S]*allow read, delete: if isAdmin\(\)/);
  assert.match(rules, /match \/versions\/\{versionId\}[\s\S]*allow read: if isAdmin\(\)/);
  assert.match(rules, /validExerciseFields/);
  assert.match(rules, /request\.resource\.data\.status in \['published', 'disabled', 'archived'\]/);
});

test('Storage is limited to admin image uploads and published image reads', () => {
  assert.match(storageRules, /match \/exercise-images\/\{workbook\}\/\{lessonId\}\/\{exerciseId\}\/\{fileName\}/);
  assert.match(storageRules, /request\.resource\.size <= 5 \* 1024 \* 1024/);
  assert.match(storageRules, /image\/\(png\|jpeg\|webp\)/);
  assert.match(storageRules, /publishedExerciseOverrides/);
  assert.match(storageRules, /allow create, update: if isAdmin\(\)/);
});

test('day loading is batched, cached, and falls back without blocking practice', () => {
  assert.match(service, /loadPublishedDayOverrides/);
  assert.match(service, /where\('dayId', '==', dayId\)/);
  assert.match(service, /memoryCache/);
  assert.match(service, /localStorage/);
  assert.match(service, /using local\/cached content/);
  assert.match(practice, /readCachedDayOverrides/);
  assert.match(practice, /loadPublishedDayOverrides/);
  assert.doesNotMatch(practice, /getExerciseOverride\(currentExercise/);
});

test('admin workflow exposes manual search, drafts, preview, publishing, restore and conflict checks', () => {
  assert.match(dashboard, /Localizar exercício sem relatório/);
  assert.match(dashboard, /Editar exercício/);
  assert.match(editor, /Salvar rascunho/);
  assert.match(editor, /Pré-visualização e teste/);
  assert.match(editor, /Publicar correção/);
  assert.match(editor, /Restaurar/);
  assert.match(editor, /Voltar ao exercício original/);
  assert.match(service, /alterado por outro administrador/);
  assert.match(service, /transaction\.set\(doc\(canonicalRef, 'versions'/);
});

test('upload cannot remain silently stuck and exposes every required visual state', () => {
  assert.match(imageService, /EXERCISE_IMAGE_START_TIMEOUT_MS = 20_000/);
  assert.match(imageService, /storage\/upload-stalled/);
  assert.match(imageService, /task\.cancel\(\)/);
  for (const state of ['selected', 'uploading', 'completed', 'canceled', 'error']) assert.match(editor, new RegExp(`'${state}'`));
  assert.match(editor, /Aguarde o envio da imagem antes de salvar ou publicar/);
  assert.match(editor, /Upload da imagem concluído com sucesso/);
  assert.match(editor, /imageUpload\.imagePath/);
  assert.match(editor, /600|1200 × 1200/);
});

test('frontend preflight uses the same Firestore admin profile as both rule sets', () => {
  assert.match(accessService, /users.*user\.uid/);
  assert.match(accessService, /profile\.data\(\)\?\.role !== 'admin'/);
  assert.match(rules, /userDoc\(\)\.data\.role == 'admin'/);
  assert.match(storageRules, /documents\/users\/\$\(request\.auth\.uid\)/);
  assert.match(errorService, /storage\/unauthorized/);
  assert.match(editor, /Correção publicada com sucesso[\s\S]*relatório não foi resolvido/);
});
