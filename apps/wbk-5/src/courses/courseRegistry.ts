// Course-aware workbook registry.
// English uses the existing data/workbook* files (backward-compatible).
// All other courses point to their own src/courses/{id}/workbook*.ts stubs.

import { WORKBOOKS } from '../data/workbookRegistry';

export const COURSE_WORKBOOKS: Record<string, Record<number, () => Promise<any>>> = {
  english: WORKBOOKS,

  spanish: {
    1: () => import('./spanish/workbook1'),
  },

  portuguese_native: {
    1: () => import('./portuguese_native/workbook1'),
  },

  portuguese_foreigners: {
    1: () => import('./portuguese_foreigners/workbook1'),
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
