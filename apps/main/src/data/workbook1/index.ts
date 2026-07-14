import { lesson1 } from './lesson1';
import { lesson2 } from './lesson2';
import { lesson3 } from './lesson3';
import { lesson4 } from './lesson4';
import { lesson5 } from './lesson5';
import { lesson6 } from './lesson6';
import { lesson7 } from './lesson7';
import { lesson8 } from './lesson8';
import { lesson9 } from './lesson9';
import { lesson10 } from './lesson10';
import { lesson11 } from './lesson11';
import { lesson12 } from './lesson12';
import { normalizeLessonsToOfficialTrails } from '../shared/normalizeOfficialWorkbookLessons';
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
  ],
};
