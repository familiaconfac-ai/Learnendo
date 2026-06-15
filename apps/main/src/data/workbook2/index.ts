import { workbook2Lessons } from './lessons';
import { normalizeLessonsToOfficialTrails } from '../shared/normalizeOfficialWorkbookLessons';

export const workbook2 = {
  id: 'wb2',
  title: 'Workbook 2',
  lessons: normalizeLessonsToOfficialTrails(workbook2Lessons),
};
