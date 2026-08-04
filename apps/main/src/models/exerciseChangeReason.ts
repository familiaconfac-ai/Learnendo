export const MIN_EXERCISE_CHANGE_REASON_LENGTH = 5;
export const DEFAULT_EXERCISE_CHANGE_REASON = 'Correção publicada a partir de relatório administrativo.';

export type ExerciseChangeReasonAction = 'publish' | 'disable';

export function normalizeExerciseChangeReason(value: string): string {
  return value.trim();
}

export function resolveExercisePublicationReason(input: {
  editorialReason?: unknown;
  suggestedReportReason?: unknown;
  reportDescription?: unknown;
}): string {
  const candidates = [input.editorialReason, input.suggestedReportReason, input.reportDescription];
  for (const candidate of candidates) {
    const normalized = normalizeExerciseChangeReason(String(candidate ?? ''));
    if (normalized) return normalized;
  }
  return DEFAULT_EXERCISE_CHANGE_REASON;
}

export function validateExerciseChangeReason(
  value: string,
  action: ExerciseChangeReasonAction = 'publish',
): string | null {
  const normalized = normalizeExerciseChangeReason(value);
  if (!normalized) {
    return action === 'disable'
      ? 'Informe o motivo da desativação antes de continuar.'
      : 'Informe o motivo da alteração antes de publicar.';
  }
  if (normalized.length < MIN_EXERCISE_CHANGE_REASON_LENGTH) {
    return 'Descreva o motivo da alteração com pelo menos 5 caracteres.';
  }
  return null;
}
