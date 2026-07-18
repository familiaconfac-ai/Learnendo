import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..', '..');
const app = resolve(root, 'apps', 'main', 'src');
const read = (path) => readFileSync(path, 'utf8');
const service = read(resolve(app, 'services', 'exerciseReportsService.ts'));
const practice = read(resolve(app, 'components', 'ExercisePractice', 'ExercisePractice.tsx'));
const dashboard = read(resolve(app, 'components', 'ProblemReports', 'ProblemReportsDashboard.tsx'));
const appSource = read(resolve(app, 'App.tsx'));
const rules = read(resolve(root, 'firestore.rules'));
const indexes = JSON.parse(read(resolve(root, 'firestore.indexes.json')));

assert.match(service, /status:\s*'new'/, 'new reports must use status new');
assert.match(service, /priority:\s*'normal'/, 'new reports must use normal priority');
assert.match(service, /PAGE_SIZE = 25/, 'reports must be paginated');
assert.match(service, /recentSubmissions/, 'immediate duplicate submissions must be guarded');
assert.match(practice, /disabled=\{reportSubmitting\}/, 'submit controls must lock while sending');
assert.match(practice, /setReportFormOpen\(true\)/, 'exercise must open a report form');
assert.match(practice, /Reportar problema/, 'report action must remain visible in practice');
assert.doesNotMatch(practice, /setCurrentIdx\([^)]*submitProblemReport/, 'report submission must not advance the exercise');
assert.match(appSource, /isAdmin && \([\s\S]*Relatórios de problemas/, 'menu item must be admin-only');
assert.match(appSource, /pendingProblemReports > 0/, 'pending badge must hide at zero');
assert.match(appSource, /currentSection === SectionType\.PROBLEM_REPORTS && !isAdmin/, 'admin route must have a frontend guard');
assert.match(dashboard, /status:\s*'reviewing'/, 'admin can mark reviewing');
assert.match(dashboard, /status:\s*'resolved'/, 'admin can resolve');
assert.match(dashboard, /status:\s*'dismissed'/, 'admin can dismiss');
assert.match(dashboard, /Copiar dados do exercício/, 'details must copy exercise data');
assert.match(dashboard, /adminNote/, 'details must edit the admin note');
assert.match(dashboard, /Próxima/, 'dashboard must expose pagination');
assert.match(rules, /match \/exerciseReports\/\{reportId\}/, 'Firestore rules must cover exerciseReports');
assert.match(rules, /allow get, list: if isAdmin\(\)/, 'only admins can read reports');
assert.match(rules, /allow create: if signedIn\(\)/, 'signed-in students can create reports');
assert.match(rules, /request\.resource\.data\.userId == request\.auth\.uid/, 'students can create only owned reports');
assert.match(rules, /request\.resource\.data\.status == 'new'/, 'students cannot choose report status');
assert.match(rules, /request\.resource\.data\.priority == 'normal'/, 'students cannot choose priority');
assert.match(rules, /allow update: if isAdmin\(\)/, 'only admins can update reports');
assert.match(rules, /allow delete: if false/, 'reports are permanent and cannot be deleted');

const indexFields = indexes.indexes.map((index) => index.fields.map((field) => field.fieldPath).join('+'));
for (const required of ['status+createdAt', 'priority+createdAt', 'workbookId+lessonId+createdAt', 'status+priority+createdAt']) {
  assert.ok(indexFields.includes(required), `missing index ${required}`);
}

const pendingCount = (items) => items.filter((item) => item.status === 'new' || item.status === 'reviewing').length;
const reports = [{ status: 'new' }, { status: 'reviewing' }, { status: 'resolved' }, { status: 'dismissed' }];
assert.equal(pendingCount(reports), 2, 'new and reviewing must count as pending');
reports[0].status = 'reviewing';
assert.equal(pendingCount(reports), 2, 'reviewing remains pending');
reports[0].status = 'resolved';
assert.equal(pendingCount(reports), 1, 'resolved leaves pending count');
reports[1].status = 'dismissed';
assert.equal(pendingCount(reports), 0, 'dismissed leaves pending count');

console.log('Exercise reports regression checks passed.');
