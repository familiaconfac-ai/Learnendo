import type { IncomingMessage, ServerResponse } from 'node:http';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb, requireAdmin } from '../server/firebaseAdmin';

type RequestLike = IncomingMessage & { method?: string; body?: unknown };
type ResponseLike = ServerResponse<IncomingMessage> & {
  status?: (code: number) => ResponseLike;
  json?: (body: unknown) => void;
};

type AdminAction = 'details' | 'create' | 'update' | 'setPassword';
interface Body {
  action?: AdminAction;
  uid?: string;
  name?: string;
  email?: string;
  password?: string;
  disabled?: boolean;
  groupId?: string | null;
}

function sendJson(res: ResponseLike, status: number, body: unknown) {
  if (res.status && res.json) return res.status(status).json(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req: RequestLike): Promise<Body> {
  if (req.body && typeof req.body === 'object') return req.body as Body;
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Body;
}

function cleanEmail(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

async function assignGroup(uid: string, name: string, targetGroupId?: string | null) {
  const groups = await adminDb.collection('liveClassGroups').get();
  const batch = adminDb.batch();
  groups.docs.forEach((groupDoc) => {
    const data = groupDoc.data();
    const ids = Array.isArray(data.assignedStudentIds) ? data.assignedStudentIds.filter((id): id is string => typeof id === 'string') : [];
    const names = Array.isArray(data.assignedStudentNames) ? data.assignedStudentNames.filter((item): item is string => typeof item === 'string') : [];
    const nextPairs = ids.map((id, index) => ({ id, name: names[index] ?? id })).filter((item) => item.id !== uid);
    if (groupDoc.id === targetGroupId) nextPairs.push({ id: uid, name });
    if (nextPairs.length !== ids.length || groupDoc.id === targetGroupId) {
      batch.update(groupDoc.ref, {
        assignedStudentIds: nextPairs.map((item) => item.id),
        assignedStudentNames: nextPairs.map((item) => item.name),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
  await batch.commit();
}

function publicAccount(user: Awaited<ReturnType<typeof adminAuth.getUser>>) {
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    disabled: user.disabled,
    emailVerified: user.emailVerified,
    creationTime: user.metadata.creationTime,
    lastSignInTime: user.metadata.lastSignInTime ?? null,
    providerIds: user.providerData.map((provider) => provider.providerId),
  };
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

  try {
    const admin = await requireAdmin(req.headers.authorization);
    const body = await readBody(req);

    if (body.action === 'details') {
      if (!body.uid) return sendJson(res, 400, { error: 'Student UID is required.' });
      return sendJson(res, 200, { account: publicAccount(await adminAuth.getUser(body.uid)) });
    }

    if (body.action === 'create') {
      const name = body.name?.trim() ?? '';
      const email = cleanEmail(body.email);
      if (!name || !email || !body.password || body.password.length < 6) {
        return sendJson(res, 400, { error: 'Name, valid email, and a password of at least 6 characters are required.' });
      }
      const account = await adminAuth.createUser({ email, password: body.password, displayName: name, disabled: body.disabled === true });
      try {
        await adminDb.doc(`users/${account.uid}`).set({
          uid: account.uid,
          name,
          displayName: name,
          email,
          role: 'student',
          isAnonymous: false,
          wasAnonymous: false,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: admin.uid,
          lastLoginAt: null,
        });
        await assignGroup(account.uid, name, body.groupId);
      } catch (error) {
        await adminAuth.deleteUser(account.uid).catch(() => undefined);
        throw error;
      }
      return sendJson(res, 201, { account: publicAccount(account) });
    }

    if (!body.uid) return sendJson(res, 400, { error: 'Student UID is required.' });

    if (body.action === 'setPassword') {
      if (!body.password || body.password.length < 6) {
        return sendJson(res, 400, { error: 'The temporary password must contain at least 6 characters.' });
      }
      await adminAuth.updateUser(body.uid, { password: body.password });
      return sendJson(res, 200, { ok: true });
    }

    if (body.action === 'update') {
      const name = body.name?.trim() ?? '';
      const email = cleanEmail(body.email);
      if (!name || !email) return sendJson(res, 400, { error: 'Name and email are required.' });
      const account = await adminAuth.updateUser(body.uid, {
        displayName: name,
        email,
        ...(typeof body.disabled === 'boolean' ? { disabled: body.disabled } : {}),
      });
      await adminDb.doc(`users/${body.uid}`).set({
        name,
        displayName: name,
        email,
        profileUpdatedAt: FieldValue.serverTimestamp(),
        profileUpdatedBy: admin.uid,
      }, { merge: true });
      const progressRef = adminDb.doc(`progress/${body.uid}`);
      if ((await progressRef.get()).exists) {
        await progressRef.set({ displayName: name, email, lastUpdated: new Date().toISOString() }, { merge: true });
      }
      if (Object.prototype.hasOwnProperty.call(body, 'groupId')) {
        await assignGroup(body.uid, name, body.groupId);
      }
      return sendJson(res, 200, { account: publicAccount(account) });
    }

    return sendJson(res, 400, { error: 'Unknown admin action.' });
  } catch (error) {
    const status = Number((error as { statusCode?: number }).statusCode) || 500;
    const code = (error as { code?: string }).code;
    const safeMessage = code === 'auth/email-already-exists'
      ? 'This email is already used by another account.'
      : code === 'auth/user-not-found'
        ? 'Student account not found.'
        : status < 500
          ? (error as Error).message
          : 'The administrative operation could not be completed.';
    console.error('[admin-students]', code ?? error);
    return sendJson(res, status, { error: safeMessage, code: code ?? null });
  }
}
