export interface PersistedIdentitySource {
  displayName?: unknown;
  name?: unknown;
  email?: unknown;
}

export function matchesPersistedStudentProfile(
  expected: { name: string; email: string },
  auth: PersistedIdentitySource,
  userProfile: PersistedIdentitySource,
  progressProfile: PersistedIdentitySource,
): boolean {
  return auth.displayName === expected.name
    && auth.email === expected.email
    && userProfile.name === expected.name
    && userProfile.displayName === expected.name
    && userProfile.email === expected.email
    && progressProfile.displayName === expected.name
    && progressProfile.email === expected.email;
}
