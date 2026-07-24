type AudioExerciseSource = {
  type: string;
  instruction: string;
  assessmentMode?: 'listening-writing' | 'shadowing' | 'speaking';
};

export function isDictationWritingExercise(source: AudioExerciseSource): boolean {
  if (source.type !== 'writing') return false;
  if (source.assessmentMode === 'listening-writing') return true;
  const instruction = source.instruction.toLowerCase();
  return instruction.includes('you hear')
    || instruction.includes('ouvir')
    || instruction.includes('oyes');
}

export function resolveSpokenOptionText(option: string): string {
  const normalized = option.trim();
  if (/^yes$/i.test(normalized)) return 'Yes';
  if (/^no$/i.test(normalized)) return 'No';
  return option;
}
