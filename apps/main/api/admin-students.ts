import type { IncomingMessage, ServerResponse } from 'node:http';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb, requireAdmin } from '../server/firebaseAdmin.js';
import { deleteStudentData } from '../server/studentDeletion.js';
import { getStudentDeletionBlockReason } from '../server/studentDeletionSchema.js';

type RequestLike = IncomingMessage & { method?: string; body?: unknown };
type ResponseLike = ServerResponse<IncomingMessage> & {
  status?: (code: number) => ResponseLike;
  json?: (body: unknown) => void;
};

type AdminAction = 'details' | 'create' | 'update' | 'setPassword' | 'delete';
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

function hasOwn(body: Body, field: keyof Body) {
  return Object.prototype.hasOwnProperty.call(body, field);
}

function errorInfo(reason: unknown) {
  const error = reason as { code?: string; message?: string };
  return {
    code: error.code ?? 'unknown',
    message: error.message ?? 'Unknown administrative error.',
  };
}

function logStageFailure(action: AdminAction, stage: string, uid: string | undefined, reason: unknown) {
  const info = errorInfo(reason);
  console.error('[admin-students]', {
    action,
    stage,
    targetUidSuffix: uid?.slice(-6) ?? null,
    code: info.code,
    message: info.message,
  });
  return info;
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

  let action: AdminAction | undefined;
  try {
    const admin = await requireAdmin(req.headers.authorization);
    const body = await readBody(req);
    action = body.action;

    if (body.action === 'details') {
      if (!body.uid) return sendJson(res, 400, { error: 'Student UID is required.' });
      try {
        return sendJson(res, 200, { account: publicAccount(await adminAuth.getUser(body.uid)), authStatus: 'found' });
      } catch (reason) {
        if ((reason as { code?: string }).code === 'auth/user-not-found') {
          return sendJson(res, 200, { account: null, authStatus: 'not-found' });
        }
        throw reason;
      }
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

    if (body.action === 'delete') {
      const [profile, targetAccount] = await Promise.all([
        adminDb.doc(`users/${body.uid}`).get(),
        adminAuth.getUser(body.uid).catch((reason) => {
          if ((reason as { code?: string }).code === 'auth/user-not-found') return null;
          throw reason;
        }),
      ]);
      const role = profile.data()?.role ?? targetAccount?.customClaims?.role;
      const blocked = getStudentDeletionBlockReason(admin.uid, body.uid, role);
      if (blocked) return sendJson(res, 409, { error: blocked });
      const deletion = await deleteStudentData(body.uid);
      return sendJson(res, 200, { ok: deletion.completed, deletion });
    }

    if (body.action === 'setPassword') {
      if (!body.password || body.password.length < 6) {
        return sendJson(res, 400, { error: 'The temporary password must contain at least 6 characters.' });
      }
      await adminAuth.updateUser(body.uid, { password: body.password });
      return sendJson(res, 200, { ok: true });
    }

    if (body.action === 'update') {
      const requested = {
        name: hasOwn(body, 'name'),
        email: hasOwn(body, 'email'),
        disabled: hasOwn(body, 'disabled'),
        class: hasOwn(body, 'groupId'),
      };
      if (!Object.values(requested).some(Boolean)) {
        return sendJson(res, 400, { error: 'No changed fields were provided.' });
      }

      const name = body.name?.trim() ?? '';
      const email = cleanEmail(body.email);
      if (requested.name && !name) return sendJson(res, 400, { error: 'Name cannot be empty.' });
      if (requested.email && !email) return sendJson(res, 400, { error: 'Email cannot be empty.' });
      if (requested.disabled && typeof body.disabled !== 'boolean') {
        return sendJson(res, 400, { error: 'Active status must be a boolean.' });
      }

      const userRef = adminDb.doc(`users/${body.uid}`);
      const progressRef = adminDb.doc(`progress/${body.uid}`);
      const [initialAccount, initialUserSnapshot, initialProgressSnapshot] = await Promise.all([
        adminAuth.getUser(body.uid).catch((reason) => {
          if ((reason as { code?: string }).code === 'auth/user-not-found') return null;
          throw reason;
        }),
        userRef.get(),
        progressRef.get(),
      ]);

      const initialUser = initialUserSnapshot.data() ?? {};
      const initialProgress = initialProgressSnapshot.data() ?? {};
      const effectiveName = name || String(initialProgress.displayName ?? initialUser.displayName ?? initialUser.name ?? initialAccount?.displayName ?? body.uid);
      const fields: Record<'name' | 'email' | 'disabled' | 'class', 'not-requested' | 'saved' | 'unchanged' | 'failed'> = {
        name: requested.name ? 'unchanged' : 'not-requested',
        email: requested.email ? 'unchanged' : 'not-requested',
        disabled: requested.disabled ? 'unchanged' : 'not-requested',
        class: requested.class ? 'unchanged' : 'not-requested',
      };
      const errors: Array<{ field: string; stage: string; code: string; message: string }> = [];
      const warnings: Array<{ field: string; stage: string; code: string; message: string }> = [];

      if (requested.name) {
        const firestoreNameChanged = initialUser.name !== name || initialUser.displayName !== name || initialProgress.displayName !== name;
        if (firestoreNameChanged) {
          try {
            const profileBatch = adminDb.batch();
            profileBatch.set(userRef, {
              name,
              displayName: name,
              profileUpdatedAt: FieldValue.serverTimestamp(),
              profileUpdatedBy: admin.uid,
            }, { merge: true });
            profileBatch.set(progressRef, {
              displayName: name,
              lastUpdated: new Date().toISOString(),
            }, { merge: true });
            await profileBatch.commit();
            fields.name = 'saved';
          } catch (reason) {
            fields.name = 'failed';
            errors.push({ field: 'name', stage: 'firestore-profile', ...logStageFailure('update', 'firestore-profile', body.uid, reason) });
          }
        }

        // The dashboard's visible source of truth is Firestore. Auth displayName is
        // synchronized independently and can never invalidate a successful name save.
        if (fields.name !== 'failed' && initialAccount?.displayName !== name) {
          try {
            if (!initialAccount) throw Object.assign(new Error('Student account not found in Authentication.'), { code: 'auth/user-not-found' });
            await adminAuth.updateUser(body.uid, { displayName: name });
            if (fields.name === 'unchanged') fields.name = 'saved';
          } catch (reason) {
            warnings.push({ field: 'name', stage: 'auth-display-name', ...logStageFailure('update', 'auth-display-name', body.uid, reason) });
          }
        }
      }

      if (requested.email && initialAccount?.email !== email) {
        let emailStage = 'auth-email';
        try {
          if (!initialAccount) throw Object.assign(new Error('Student account not found in Authentication.'), { code: 'auth/user-not-found' });
          await adminAuth.updateUser(body.uid, { email });
          emailStage = 'firestore-email';
          const emailBatch = adminDb.batch();
          emailBatch.set(userRef, { email, profileUpdatedAt: FieldValue.serverTimestamp(), profileUpdatedBy: admin.uid }, { merge: true });
          emailBatch.set(progressRef, { email, lastUpdated: new Date().toISOString() }, { merge: true });
          await emailBatch.commit();
          fields.email = 'saved';
        } catch (reason) {
          fields.email = 'failed';
          errors.push({ field: 'email', stage: emailStage, ...logStageFailure('update', emailStage, body.uid, reason) });
        }
      }

      if (requested.disabled && initialAccount?.disabled !== body.disabled) {
        try {
          if (!initialAccount) throw Object.assign(new Error('Student account not found in Authentication.'), { code: 'auth/user-not-found' });
          await adminAuth.updateUser(body.uid, { disabled: body.disabled });
          fields.disabled = 'saved';
        } catch (reason) {
          fields.disabled = 'failed';
          errors.push({ field: 'disabled', stage: 'auth-disabled', ...logStageFailure('update', 'auth-disabled', body.uid, reason) });
        }
      }

      if (requested.class) {
        try {
          await assignGroup(body.uid, effectiveName, body.groupId);
          fields.class = 'saved';
        } catch (reason) {
          fields.class = 'failed';
          errors.push({ field: 'class', stage: 'firestore-class', ...logStageFailure('update', 'firestore-class', body.uid, reason) });
        }
      } else if (requested.name && fields.name !== 'failed') {
        // Keep the denormalized roster label aligned without changing membership.
        try {
          const groups = await adminDb.collection('liveClassGroups').get();
          const current = groups.docs.find((doc) => (doc.data().assignedStudentIds ?? []).includes(body.uid));
          if (current) await assignGroup(body.uid, effectiveName, current.id);
        } catch (reason) {
          warnings.push({ field: 'name', stage: 'class-roster-label', ...logStageFailure('update', 'class-roster-label', body.uid, reason) });
        }
      }

      const [account, userSnapshot, progressSnapshot] = await Promise.all([
        adminAuth.getUser(body.uid).catch(() => null),
        userRef.get(),
        progressRef.get(),
      ]);
      const persistedUser = userSnapshot.data() ?? {};
      const persistedProgress = progressSnapshot.data() ?? {};

      return sendJson(res, 200, {
        ok: errors.length === 0,
        partial: errors.length > 0 && Object.values(fields).some((status) => status === 'saved'),
        fields,
        errors,
        warnings,
        account: account ? publicAccount(account) : null,
        profile: {
          uid: body.uid,
          name: String(persistedUser.name ?? persistedProgress.displayName ?? effectiveName),
          displayName: String(persistedProgress.displayName ?? persistedUser.displayName ?? persistedUser.name ?? effectiveName),
          email: String(account?.email ?? persistedUser.email ?? persistedProgress.email ?? ''),
        },
      });
    }

    return sendJson(res, 400, { error: 'Unknown admin action.' });
  } catch (error) {
    const status = Number((error as { statusCode?: number }).statusCode) || 500;
    const code = (error as { code?: string }).code;
    const fallbackByAction: Record<AdminAction, string> = {
      details: 'Failed to load authentication information.',
      create: 'Failed to create student.',
      update: 'Failed to update student.',
      setPassword: 'Failed to set password.',
      delete: 'Failed to delete student.',
    };
    const safeMessage = code === 'auth/email-already-exists'
      ? 'This email is already used by another account.'
      : code === 'auth/user-not-found'
        ? 'Student account not found in Authentication.'
        : status < 500
          ? (error as Error).message
          : action
            ? fallbackByAction[action]
            : 'The administrative operation could not be completed.';
    const technical = logStageFailure(action ?? 'details', 'request', undefined, error);
    return sendJson(res, status, { error: safeMessage, code: code ?? null, technical });
  }
}
