import { createHash, timingSafeEqual } from 'node:crypto';

function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

export function isAuthorizedCronRequest(authorization: string | undefined, secret: string | undefined) {
  if (!secret || secret.length < 16 || !authorization?.startsWith('Bearer ')) return false;
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}
