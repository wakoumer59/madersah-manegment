import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAdminServices } from '../../server/firebaseAdmin.js';

interface ApiRequest extends IncomingMessage {
  body?: unknown;
}

function respond(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : 'unknown';
}

function bearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { error: 'Method not allowed.' });
  }
  const token = bearerToken(req);
  if (!token) return respond(res, 401, { error: 'Sign in before changing your password.' });

  let newPassword: unknown;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    newPassword = body && typeof body === 'object'
      ? (body as Record<string, unknown>).newPassword
      : null;
  } catch {
    return respond(res, 400, { error: 'Invalid request.' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return respond(res, 400, { error: 'Use a password between 8 and 128 characters.' });
  }

  try {
    const { auth, database } = getAdminServices();
    const decodedToken = await auth.verifyIdToken(token, true);
    const now = Math.floor(Date.now() / 1000);
    if (now - decodedToken.auth_time > 10 * 60) {
      return respond(res, 401, { error: 'Sign in again before changing your temporary password.' });
    }
    const flag = database.ref(`users/${decodedToken.uid}/mustChangePassword`);
    const snapshot = await flag.get();
    if (snapshot.val() !== true) {
      return respond(res, 409, { error: 'This account does not require a temporary-password change.' });
    }

    await auth.updateUser(decodedToken.uid, { password: newPassword });
    await flag.set(false);
    return respond(res, 200, { ok: true });
  } catch (error) {
    console.error('Password change failed:', errorCode(error));
    return respond(res, 500, { error: 'Your password could not be changed. Please retry.' });
  }
}
