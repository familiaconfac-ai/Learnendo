export interface LiveKitClassAccessData {
  createdBy?: string;
  teacherUid?: string;
  assignedStudentIds?: unknown;
  deletedAt?: unknown;
}

export type LiveKitAuthorizedRole = 'teacher' | 'student';

export function requireLiveKitBearerToken(authorization?: string): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('Authentication required.'), { statusCode: 401 });
  return match[1];
}

export function resolveLiveKitRole(
  uid: string,
  email: string | undefined,
  profileRole: unknown,
  liveClass: LiveKitClassAccessData,
): LiveKitAuthorizedRole | null {
  if (liveClass.deletedAt) return null;
  if (profileRole === 'admin' || liveClass.createdBy === uid || liveClass.teacherUid === uid) return 'teacher';
  const assigned = Array.isArray(liveClass.assignedStudentIds) ? liveClass.assignedStudentIds : [];
  const normalizedEmail = email?.trim().toLowerCase();
  if (assigned.includes(uid)) return 'student';
  if (normalizedEmail && assigned.some((value) => typeof value === 'string' && value.trim().toLowerCase() === normalizedEmail)) {
    return 'student';
  }
  return null;
}

export function sanitizeLiveKitTabId(value: unknown): string {
  if (typeof value !== 'string') return 'default';
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  return sanitized || 'default';
}

export function buildAuthorizedLiveKitIdentity(role: LiveKitAuthorizedRole, uid: string): string {
  // Stable per room/user so LiveKit also rejects concurrent media sessions
  // coming from another browser or device, beyond the same-browser tab lease.
  return `${role}:${uid}`;
}
