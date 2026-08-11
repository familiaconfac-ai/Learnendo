type DashboardProgress = Record<string, any>;

export function getUniqueCompletedActivityCount(raw?: DashboardProgress): number {
  const lessons = raw?.lessons;
  if (lessons && typeof lessons === 'object') {
    const uniqueCompleted = Object.values(lessons).filter((value) =>
      Boolean(value) && typeof value === 'object' && (value as { completed?: boolean }).completed === true).length;
    if (uniqueCompleted > 0) return uniqueCompleted;
  }
  return typeof raw?.daysCompleted === 'number' ? Math.max(0, raw.daysCompleted) : 0;
}

export function deriveDashboardAnswerMetrics(raw?: DashboardProgress) {
  const totalAttempts = typeof raw?.totalAttempts === 'number' ? Math.max(0, raw.totalAttempts) : 0;
  const totalCorrect = typeof raw?.totalCorrect === 'number' ? Math.max(0, raw.totalCorrect) : null;
  const totalErrors = typeof raw?.totalErrors === 'number'
    ? Math.max(0, raw.totalErrors)
    : totalCorrect !== null
      ? Math.max(0, totalAttempts - totalCorrect)
      : 0;
  const avgAccuracy = typeof raw?.avgAccuracy === 'number' && raw.avgAccuracy > 0
    ? raw.avgAccuracy
    : totalCorrect !== null && totalAttempts > 0
      ? Math.round((totalCorrect / totalAttempts) * 100)
      : 0;
  return { totalAttempts, totalErrors, avgAccuracy };
}
