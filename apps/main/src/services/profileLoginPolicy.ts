export interface LoginProfileFields {
  name: string;
  email: string | null;
}

/** Existing documents belong to their profile editors; login owns only authentication metadata. */
export function buildLoginProfilePatch(
  existing: Record<string, unknown> | null,
  user: { uid: string; displayName?: string | null; email?: string | null; isAnonymous: boolean },
  timestamp: unknown,
  emailOverride?: string,
): Record<string, unknown> {
  if (existing !== null) return {
    isAnonymous: user.isAnonymous,
    wasAnonymous: Boolean(existing.wasAnonymous || existing.isAnonymous || user.isAnonymous),
    lastLoginAt: timestamp,
  };
  const identity = resolveLoginProfileFields({}, user.displayName, user.email, emailOverride);
  return {
    uid: user.uid, name: identity.name, displayName: identity.name, email: identity.email,
    isAnonymous: user.isAnonymous, wasAnonymous: user.isAnonymous,
    createdAt: timestamp, lastLoginAt: timestamp,
  };
}

export function resolveLoginProfileFields(
  existingProfile: Record<string, unknown>,
  authDisplayName?: string | null,
  authEmail?: string | null,
  emailOverride?: string,
): LoginProfileFields {
  const existingName = String(existingProfile.name || existingProfile.displayName || '').trim();
  const hasOfficialEmail = Object.prototype.hasOwnProperty.call(existingProfile, 'email');
  const email = hasOfficialEmail
    ? (typeof existingProfile.email === 'string' ? existingProfile.email : null)
    : emailOverride || authEmail || null;
  const fallbackName = email ? email.split('@')[0] : 'User';

  return {
    name: existingName || authDisplayName?.trim() || fallbackName,
    email,
  };
}
