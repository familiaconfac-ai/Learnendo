export async function sha256Hex(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function notificationDeviceIdFromFid(fid: string) {
  const normalized = fid.trim();
  if (!normalized) throw new Error('Firebase Installation ID is empty.');
  return sha256Hex(normalized);
}
