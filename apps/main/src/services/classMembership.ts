import type { LiveClassGroup } from '../types';
import type { TeacherStudentRow } from '../engine/teacherService';

export function getClassMemberRows(
  group: Pick<LiveClassGroup, 'assignedStudentIds'> | null,
  students: TeacherStudentRow[],
): TeacherStudentRow[] {
  if (!group) return [];
  const byUid = new Map(students.map((student) => [student.uid, student]));
  return group.assignedStudentIds
    .map((uid) => byUid.get(uid))
    .filter((student): student is TeacherStudentRow => Boolean(student));
}
