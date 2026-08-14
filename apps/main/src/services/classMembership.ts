import type { LiveClassGroup } from '../types';
import type { TeacherStudentRow } from '../engine/teacherService';
import { isStudentAccountRole } from './studentRolePolicy';

export interface ClassComposition {
  teacher: TeacherStudentRow | null;
  students: TeacherStudentRow[];
  members: TeacherStudentRow[];
}

function isAdministrativeMember(student: TeacherStudentRow): boolean {
  return !isStudentAccountRole(student.role);
}

export function getClassComposition(
  group: Pick<LiveClassGroup, 'assignedStudentIds' | 'createdBy'> | null,
  rows: TeacherStudentRow[],
): ClassComposition {
  if (!group) return { teacher: null, students: [], members: [] };

  const byUid = new Map(rows.map((row) => [row.uid, row]));
  const assigned = group.assignedStudentIds
    .map((uid) => byUid.get(uid))
    .filter((row): row is TeacherStudentRow => Boolean(row));

  // `createdBy` is the class ownership source. It identifies the teacher even
  // when that account has an administrative role, and it works whether or not
  // the owner was also persisted in assignedStudentIds.
  const teacher = byUid.get(group.createdBy)
    ?? assigned.find(isAdministrativeMember)
    ?? null;

  // Legacy student profiles may not have a role. Class membership is enough
  // unless the member is positively identified as the owner/teacher/admin.
  const students = assigned.filter((row) =>
    row.uid !== teacher?.uid && !isAdministrativeMember(row));

  return {
    teacher,
    students,
    members: teacher
      ? [teacher, ...students.filter((student) => student.uid !== teacher.uid)]
      : students,
  };
}

export function getClassMemberRows(
  group: Pick<LiveClassGroup, 'assignedStudentIds' | 'createdBy'> | null,
  students: TeacherStudentRow[],
): TeacherStudentRow[] {
  return getClassComposition(group, students).members;
}
