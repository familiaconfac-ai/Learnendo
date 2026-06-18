import { workbook4Lessons } from './lessons';
import { normalizeLessonsToOfficialTrails } from '../shared/normalizeOfficialWorkbookLessons';

export const workbook4 = {
  id: 'wb4',
  title: 'Workbook 4',
  lessons: normalizeLessonsToOfficialTrails(workbook4Lessons),
};
