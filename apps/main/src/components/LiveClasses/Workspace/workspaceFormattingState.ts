export type MixedValue<T> = T | 'mixed' | null;

export function summarizeFormattingValues<T>(values: T[]): MixedValue<T> {
  if (values.length === 0) return null;
  const first = values[0];
  return values.every((value) => value === first) ? first : 'mixed';
}

export function parseEffectiveFontSize(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}
