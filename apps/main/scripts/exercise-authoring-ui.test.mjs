import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../src/components/AdminExercises/ExerciseAuthoringWorkspace.tsx', import.meta.url), 'utf8');
const practice = readFileSync(new URL('../src/components/ExercisePractice/ExercisePractice.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const reports = readFileSync(new URL('../src/components/ProblemReports/ProblemReportsDashboard.tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/dayExerciseAuthoringService.ts', import.meta.url), 'utf8');
const rules = readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8');

for (const label of ['Novo exercício', 'Editar exercício existente', 'Reconstruir este exercício', 'Criar lote de exercícios', 'Importar JSON', 'Copiar modelo de prompt para IA', 'Visualizar no sandbox', 'Salvar como rascunho', 'Publicar', 'Cancelar', 'Voltar']) assert.match(ui, new RegExp(label));
for (const mode of ['append', 'insert_at', 'replace_day', 'replace_positions']) assert.match(ui + service, new RegExp(mode));
assert.match(ui, /Fechar visualização/);
assert.match(ui, /event\.key === 'Escape'/);
assert.match(ui, /window\.history\?\.pushState/);
assert.match(ui, /currentLanguage=\{language\} embedded/);
assert.match(readFileSync(new URL('../src/components/UI.tsx', import.meta.url), 'utf8'), /embedded \? 'relative h-/);
assert.match(ui, /Sem gravação de progresso, domínio, mastery ou conclusão/);
assert.match(reports, /Corrigir no Construtor/);
assert.match(ui, /NÃO foi marcado como resolvido/);
assert.match(service, /runTransaction/);
assert.match(service, /transaction\.set\(publicRef/);
assert.match(service, /transaction\.delete\(draftRef/);
assert.match(practice, /resolveAuthoredDayExercises/);
assert.match(app, /courseId=\{currentCourseId/);
assert.match(rules, /match \/publishedDayExerciseSequences/);
assert.match(rules, /allow read: if signedIn\(\)/);
assert.doesNotMatch(ui, /audioUrl.*<input/);
const sharedUi = readFileSync(new URL('../src/components/UI.tsx', import.meta.url), 'utf8');
assert.match(sharedUi, /repeatMicAvailable\(repeatPhase\)/);
assert.match(sharedUi, /Tentar ouvir novamente/);
assert.match(sharedUi, /result\.state === 'cancelled'/);
assert.match(ui, /Duplicar como outro tipo/);
assert.match(ui, /validatePublishedExerciseTypes|lockType/);
assert.match(service, /validatePublishedExerciseTypes/);
assert.match(ui, /Descartar as alterações não salvas/);

console.log('Exercise authoring UI and transactional wiring checks passed.');
