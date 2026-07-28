import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../../', import.meta.url);
const [rules, storageRules, service, editor, practice, dashboard, imageService, accessService, errorService, userRoles, app, dbService, reasonModel] = await Promise.all([
  readFile(new URL('firestore.rules', root), 'utf8'),
  readFile(new URL('storage.rules', root), 'utf8'),
  readFile(new URL('../src/services/exerciseOverrideService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ProblemReports/ExerciseEditorModal.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ExercisePractice/ExercisePractice.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ProblemReports/ProblemReportsDashboard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/exerciseImageService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/editorialAccessService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/editorialFirebaseError.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/userRoles.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/db.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/models/exerciseChangeReason.ts', import.meta.url), 'utf8'),
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

test('change reason has one draft-backed state and is not reused from the published version', () => {
  assert.match(editor, /const \[changeReason, setChangeReason\] = useState\(''\)/);
  assert.doesNotMatch(editor, /const \[reason, setReason\]/);
  assert.match(editor, /setChangeReason\(next\.draft\?\.changeReason \?\? ''\)/);
  assert.match(editor, /documentValue\?\.status === 'draft' \? documentValue\.changeReason : ''/);
  assert.match(service, /status: 'draft'[\s\S]*changeReason: input\.changeReason\.trim\(\)/);
});

test('draft and preview do not require a change reason', () => {
  assert.match(editor, /const saveDraft = async \(\) =>/);
  assert.match(editor, /await saveExerciseDraft\(\{[^}]*changeReason/);
  assert.match(editor, /setPreview\(true\)/);
  assert.doesNotMatch(editor, /const saveDraft = async \(\) => \{[\s\S]{0,250}requireValidChangeReason/);
});

test('publishing, disabling and restoring the original require a trimmed specific reason', () => {
  assert.match(editor, /requireValidChangeReason\(status\)/);
  assert.match(service, /normalizeExerciseChangeReason\(input\.changeReason\)/);
  assert.match(service, /validateExerciseChangeReason\(changeReason, input\.status === 'disabled'/);
  assert.match(service, /removePublishedExerciseOverride[\s\S]*validateExerciseChangeReason\(changeReason\)/);
  assert.match(editor, /Motivo da restauração do original \(mínimo 5 caracteres\)/);
  assert.match(service, /Restauração da versão/);
});

test('missing publication reason is visible, focused and scrolled into view without clearing fields', () => {
  assert.match(editor, /ref=\{changeReasonRef\}/);
  assert.match(editor, /scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
  assert.match(editor, /focus\(\{ preventScroll: true \}\)/);
  assert.match(editor, /aria-invalid=\{Boolean\(changeReasonError\)\}/);
  assert.match(reasonModel, /Informe o motivo da alteração antes de publicar\./);
  assert.doesNotMatch(editor, /requireValidChangeReason[\s\S]{0,900}setFields\(/);
});

test('change reason UI is multiline, responsive, near the footer and can copy a report description explicitly', () => {
  assert.match(editor, /Motivo da alteração\s*<span/);
  assert.match(editor, /Explique brevemente o que foi corrigido e por quê\./);
  assert.match(editor, /textarea[\s\S]*min-h-28 w-full/);
  assert.match(editor, /pb-40[^"\n]*sm:pb-32/);
  assert.match(editor, /Usar descrição do relatório como motivo/);
  assert.match(editor, /onClick=\{\(\) => \{ setChangeReason\(report\.studentComment\.trim\(\)\)/);
});

test('reason stays in admin history and is excluded from the student projection', () => {
  assert.match(editor, /version\.changeReason/);
  assert.match(service, /const adminValue = \{[\s\S]*changeReason/);
  assert.match(service, /const publicValue = \{ \.\.\.safeIdentity, status, version, override: sanitizeExerciseOverride\(override\), publishedAt/);
  assert.doesNotMatch(service, /const publicValue = \{[^\n]*changeReason/);
  assert.match(rules, /data\.status == 'draft' \|\| \(data\.changeReason\.size\(\) >= 5/);
});

test('image upload is disabled without making the editor depend on Storage', () => {
  assert.match(editor, /Envio de novas imagens temporariamente indisponível/);
  assert.match(editor, /O restante do exercício pode ser editado, salvo e publicado normalmente/);
  assert.match(editor, /Upload de imagens/);
  assert.doesNotMatch(editor, /uploadExerciseImage/);
  assert.doesNotMatch(editor, /type="file"/);
  assert.doesNotMatch(editor, /isUploading|uploadTask|imageUpload|pendingImage|selectedImageFile/);
  assert.match(editor, /effective\.imageUrl/);
  assert.match(editor, /effective\.imageAlt/);

  // A arquitetura futura permanece disponível, mas não é importada pelo editor atual.
  assert.match(imageService, /EXERCISE_IMAGE_START_TIMEOUT_MS = 20_000/);
  assert.match(imageService, /storage\/upload-stalled/);
  assert.match(imageService, /task\.cancel\(\)/);
});

test('frontend preflight and temporary diagnostics use the same Firestore admin profile as both rule sets', () => {
  assert.match(accessService, /users.*user\.uid/);
  assert.match(accessService, /role === 'admin'/);
  assert.match(accessService, /userDocumentPath/);
  assert.match(rules, /userDoc\(\)\.data\.role == 'admin'/);
  assert.match(storageRules, /documents\/users\/\$\(request\.auth\.uid\)/);
  assert.match(errorService, /storage\/unauthorized/);
  assert.match(editor, /showAuthorizationDiagnostics/);
  assert.match(editor, /Firebase Auth UID atual/);
  assert.match(editor, /role === \"admin\"/);
  assert.match(editor, /permission-denied/);
  assert.doesNotMatch(userRoles, /if \(isReservedAdminEmail\(email\)\) return 'admin'/);
  assert.match(userRoles, /return normalizeUserRole\(storedRole\)/);
  assert.doesNotMatch(app, /promoteAdminIfNeeded/);
  assert.doesNotMatch(dbService, /ADMIN_EMAILS|promoteAdminIfNeeded/);
  assert.match(rules, /allow update: if isAdmin\(\)[\s\S]*affectedKeys\(\)\.hasAny\(\['role'\]\)/);
  assert.match(editor, /Correção publicada com sucesso[\s\S]*relatório não foi resolvido/);
});
