export const MIN_EXERCISE_CHANGE_REASON_LENGTH = 5;

export type ExerciseChangeReasonAction = 'publish' | 'disable';

export function normalizeExerciseChangeReason(value: string): string {
  return value.trim();
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
