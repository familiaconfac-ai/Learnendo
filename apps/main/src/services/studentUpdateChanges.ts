export interface StudentUpdateBaseline {
  name: string;
  email: string;
  groupId: string;
  disabled: boolean | null;
}

export interface StudentUpdateValues {
  name: string;
  email: string;
  groupId: string;
  disabled: boolean;
}

export function buildStudentUpdateChanges(uid: string, baseline: StudentUpdateBaseline, values: StudentUpdateValues) {
  const name = values.name.trim();
  const email = values.email.trim().toLowerCase();
  const changes: { uid: string; name?: string; email?: string; disabled?: boolean; groupId?: string | null } = { uid };
  if (name !== baseline.name) changes.name = name;
  if (email !== baseline.email) changes.email = email;
  if (values.groupId !== baseline.groupId) changes.groupId = values.groupId || null;
  if (baseline.disabled !== null && values.disabled !== baseline.disabled) changes.disabled = values.disabled;
  return changes;
}
