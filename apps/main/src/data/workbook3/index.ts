import { workbook3Lessons } from './lessons';
import { normalizeLessonsToOfficialTrails } from '../shared/normalizeOfficialWorkbookLessons';

export const workbook3 = {
  id: 'wb3',
  title: 'Workbook 3',
  lessons: normalizeLessonsToOfficialTrails(workbook3Lessons),
};
