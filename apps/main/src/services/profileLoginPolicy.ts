export interface LoginProfileFields {
  name: string;
  email: string | null;
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
