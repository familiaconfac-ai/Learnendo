// Course-aware workbook registry.
// English uses the existing data/workbook* files (backward-compatible).
// All other courses point to their own src/courses/{id}/workbook*.ts stubs.

import { WORKBOOKS } from '../data/workbookRegistry';

export const COURSE_WORKBOOKS: Record<string, Record<number, () => Promise<any>>> = {
  english: WORKBOOKS,

  spanish: {
    1: () => import('./spanish/workbook1'),
    2: () => import('./spanish/workbook2'),
    3: () => import('./spanish/workbook3'),
    4: () => import('./spanish/workbook4'),
    5: () => import('./spanish/workbook5'),
    6: () => import('./spanish/workbook6'),
    7: () => import('./spanish/workbook7'),
    8: () => import('./spanish/workbook8'),
  },

  portuguese_native: {
    1: () => import('./portuguese_native/workbook1'),
  },

  portuguese_foreigners: {
    1: () => import('./portuguese_foreigners/workbook1'),
    2: () => import('./portuguese_foreigners/workbook2'),
    3: () => import('./portuguese_foreigners/workbook3'),
    4: () => import('./portuguese_foreigners/workbook4'),
    5: () => import('./portuguese_foreigners/workbook5'),
    6: () => import('./portuguese_foreigners/workbook6'),
    7: () => import('./portuguese_foreigners/workbook7'),
    8: () => import('./portuguese_foreigners/workbook8'),
  },

  greek_koine: {
    1: () => import('./greek_koine/workbook1'),
  },

  hebrew_biblical: {
    1: () => import('./hebrew_biblical/workbook1'),
  },

  bible_language_track: {
    1: () => import('./bible_language_track/workbook1'),
  },
};
