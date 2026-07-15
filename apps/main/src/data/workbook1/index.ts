import { lesson1 } from './lesson1.ts';
import { lesson2 } from './lesson2.ts';
import { lesson3 } from './lesson3.ts';
import { lesson4 } from './lesson4.ts';
import { lesson5 } from './lesson5.ts';
import { lesson6 } from './lesson6.ts';
import { lesson7 } from './lesson7.ts';
import { lesson8 } from './lesson8.ts';
import { lesson9 } from './lesson9.ts';
import { lesson10 } from './lesson10.ts';
import { lesson11 } from './lesson11.ts';
import { lesson12 } from './lesson12.ts';
import { normalizeLessonsToOfficialTrails } from '../shared/normalizeOfficialWorkbookLessons.ts';
import { finalizeWorkbook1Lesson } from './finalizeWorkbook1Lesson.ts';
// Add more lessons as needed

export const workbook1 = {
  id: 'wb1',
  title: 'Workbook 1',
  lessons: [
    ...normalizeLessonsToOfficialTrails([
    lesson1,
    lesson2,
    lesson3,
    lesson4,
    lesson5,
    lesson6,
    lesson7,
    ]),
    lesson8,
    lesson9,
    lesson10,
    lesson11,
    lesson12,
  ].map(finalizeWorkbook1Lesson),
};
