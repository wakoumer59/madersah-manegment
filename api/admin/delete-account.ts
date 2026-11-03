import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAdminServices } from '../../server/firebaseAdmin';

interface ApiRequest extends IncomingMessage {
  body?: unknown;
}

function respond(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req: ApiRequest): { uid?: unknown; role?: unknown } | null {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    return body && typeof body === 'object'
      ? body as { uid?: unknown; role?: unknown }
      : null;
  } catch {
    return null;
  }
}

function bearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : 'unknown';
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { error: 'Method not allowed.' });
  }
  const token = bearerToken(req);
  if (!token) return respond(res, 401, { error: 'Sign in as an institution administrator.' });
  const body = readBody(req);
  if (
    typeof body?.uid !== 'string' || !body.uid
    || (body.role !== 'teacher' && body.role !== 'student')
  ) {
    return respond(res, 400, { error: 'Select a valid account to delete.' });
  }

  let services: ReturnType<typeof getAdminServices>;
  try {
    services = getAdminServices();
  } catch (error) {
    console.error('Admin delete API configuration failed:', errorCode(error));
    return respond(res, 500, { error: 'The account service is not configured.' });
  }

  try {
    const caller = await services.auth.verifyIdToken(token, true);
    const callerSnapshot = await services.database.ref(`users/${caller.uid}`).get();
    const callerRecord = callerSnapshot.val() as Record<string, unknown> | null;
    const institutionId = callerRecord?.institutionId;
    if (
      callerRecord?.role !== 'institutionAdmin' || callerRecord.status !== 'active'
      || callerRecord.mustChangePassword === true || typeof institutionId !== 'string'
    ) {
      return respond(res, 403, { error: 'Only active institution administrators can delete accounts.' });
    }
    const institutionSnapshot = await services.database.ref(`institutions/${institutionId}/status`).get();
    if (institutionSnapshot.val() !== 'active') {
      return respond(res, 403, { error: 'This institution is not active.' });
    }

    const targetRef = services.database.ref(`users/${body.uid}`);
    const targetSnapshot = await targetRef.get();
    const targetRecord = targetSnapshot.val() as Record<string, unknown> | null;
    if (
      !targetRecord || targetRecord.role !== body.role
      || targetRecord.institutionId !== institutionId
      || (body.role !== 'teacher' && body.role !== 'student')
    ) {
      return respond(res, 404, { error: 'The account was not found in your institution.' });
    }

    const rosterPath = `${institutionId}/${body.role === 'student' ? 'students' : 'teachers'}/${body.uid}`;
    const rosterSnapshot = await services.database.ref(rosterPath).get();
    const targetAuth = await services.auth.getUser(body.uid).catch((error: unknown) => {
      if (errorCode(error) === 'auth/user-not-found') return null;
      throw error;
    });

    if (targetAuth) await services.auth.updateUser(body.uid, { disabled: true });
    try {
      await services.database.ref().update({
        [rosterPath]: null,
        [`users/${body.uid}`]: null,
      });
    } catch (error) {
      if (targetAuth) await services.auth.updateUser(body.uid, { disabled: false });
      throw error;
    }

    if (targetAuth) {
      try {
        await services.auth.deleteUser(body.uid);
      } catch (error) {
        try {
          await services.database.ref().update({
            [rosterPath]: rosterSnapshot.val(),
            [`users/${body.uid}`]: targetRecord,
          });
          await services.auth.updateUser(body.uid, { disabled: false });
        } catch (rollbackError) {
          console.error('Could not restore a partially deleted account:', errorCode(rollbackError));
        }
        throw error;
      }
    }

    return respond(res, 200, { ok: true });
  } catch (error) {
    console.error('Admin account deletion failed:', errorCode(error));
    return respond(res, 500, { error: 'The account could not be deleted. Please retry.' });
  }
}
