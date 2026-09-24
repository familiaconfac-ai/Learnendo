import { workbook4Lessons } from './lessons';
import { normalizeLessonsToOfficialTrails } from '../shared/normalizeOfficialWorkbookLessons';

const lesson38Trail1Clues: Record<string, string> = {
  apple: 'Which fruit is round and can be red or green?',
  banana: 'Which fruit is long and yellow?',
  carrot: 'Which vegetable is orange and grows underground?',
  lettuce: 'Which leafy green vegetable is often used in salads?',
  spinach: 'Which dark green leafy vegetable is often cooked or used in salads?',
  rice: 'Which food consists of small grains and is eaten with many meals?',
  garlic: 'Which strong-smelling ingredient is often used in cooking?',
  bunch: 'What do you call a group of fruit or vegetables held together?',
  clove: 'What do you call one small section of a head of garlic?',
  broccoli: 'Which green vegetable has a thick stem and small flower-like tops?',
};

function applyLesson38Trail1ListeningPattern() {
  return normalizeLessonsToOfficialTrails(workbook4Lessons).map((lesson) => {
    if (lesson.id !== 'wb4_l38') return lesson;
    return {
      ...lesson,
      days: lesson.days.map((day) => day.id !== 'wb4_l38_d1' ? day : {
        ...day,
        exercises: day.exercises.map((exercise) => {
          const naturalClue = lesson38Trail1Clues[exercise.correctValue];
          if (!naturalClue || exercise.type !== 'identification') return exercise;
          return {
            ...exercise,
            instruction: 'Listen to the clue and choose the correct word.',
            displayValue: '',
            audioValue: naturalClue,
          };
        }),
      }),
    };
  });
}

export const workbook4 = {
  id: 'wb4',
  title: 'Workbook 4',
  lessons: applyLesson38Trail1ListeningPattern(),
};
