import type { QuestionReport, QuestionOverride, ExerciseItem } from '../types';

const REPORTS_KEY = 'lab_reports';
const OVERRIDES_KEY = 'lab_overrides';

// ─── Reports ──────────────────────────────────────────────────────────────────

export function getReports(): QuestionReport[] {
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveReports(reports: QuestionReport[]): void {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function addReport(report: Omit<QuestionReport, 'id' | 'reportedAt' | 'status'>): QuestionReport {
  const r: QuestionReport = {
    ...report,
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    reportedAt: Date.now(),
    status: 'open',
  };
  const all = getReports();
  all.unshift(r);
  saveReports(all);
  return r;
}

export function updateReportStatus(
  id: string,
  status: QuestionReport['status'],
): void {
  const all = getReports();
  const idx = all.findIndex((r) => r.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], status };
    saveReports(all);
  }
}

export function countOpenReports(): number {
  return getReports().filter((r) => r.status === 'open').length;
}

// ─── Overrides ────────────────────────────────────────────────────────────────

export function getOverrides(): QuestionOverride[] {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveOverrides(overrides: QuestionOverride[]): void {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function saveOverride(override: QuestionOverride): void {
  const all = getOverrides();
  const idx = all.findIndex(
    (o) => o.questionId === override.questionId && o.packId === override.packId,
  );
  if (idx !== -1) {
    all[idx] = override;
  } else {
    all.unshift(override);
  }
  saveOverrides(all);
}

export function deleteOverride(questionId: string, packId: string): void {
  const all = getOverrides().filter(
    (o) => !(o.questionId === questionId && o.packId === packId),
  );
  saveOverrides(all);
}

/**
 * Returns the corrected version of a question if an approved override exists,
 * otherwise returns the original item unchanged.
 */
export function getEffectiveItem(
  questionId: string,
  packId: string,
  original: ExerciseItem,
): ExerciseItem {
  const override = getOverrides().find(
    (o) =>
      o.questionId === questionId &&
      o.packId === packId &&
      (o.status === 'active' || o.status === 'draft'),
  );
  return override ? override.item : original;
}
