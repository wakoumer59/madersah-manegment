import type { IncomingMessage, ServerResponse } from 'node:http';
import { ServerValue } from 'firebase-admin/database';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminServices } from '../../server/firebaseAdmin.js';

interface ApiRequest extends IncomingMessage {
  body?: unknown;
}

interface AccountRequest {
  role?: unknown;
  displayName?: unknown;
  email?: unknown;
  temporaryPassword?: unknown;
  classId?: unknown;
  admissionNo?: unknown;
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

function readBody(req: ApiRequest): AccountRequest | null {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    return body && typeof body === 'object' ? body as AccountRequest : null;
  } catch {
    return null;
  }
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
  if (!token) return respond(res, 401, { error: 'Sign in as an institution administrator.' });

  const body = readBody(req);
  const role = body?.role;
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const temporaryPassword = typeof body?.temporaryPassword === 'string' ? body.temporaryPassword : '';
  const classId = typeof body?.classId === 'string' ? body.classId.trim() : '';
  const admissionNo = typeof body?.admissionNo === 'string' ? body.admissionNo.trim() : '';
  if (
    (role !== 'teacher' && role !== 'student')
    || !displayName || displayName.length > 100
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || temporaryPassword.length < 8 || temporaryPassword.length > 128
    || (role === 'student' && (!classId || !admissionNo || admissionNo.length > 50))
  ) {
    return respond(res, 400, { error: 'Check the account details and password, then try again.' });
  }

  let services: ReturnType<typeof getAdminServices>;
  try {
    services = getAdminServices();
  } catch (error) {
    console.error('Admin account API configuration failed:', errorCode(error));
    return respond(res, 500, { error: 'The account service is not configured.' });
  }
  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await services.auth.verifyIdToken(token, true);
  } catch (error) {
    console.error('Admin account API authentication failed:', errorCode(error));
    return respond(res, 401, { error: 'Could not verify your account. Sign in again and retry.' });
  }

  try {
    const adminSnapshot = await services.database.ref(`users/${decodedToken.uid}`).get();
    const adminRecord = adminSnapshot.val() as Record<string, unknown> | null;
    const institutionId = adminRecord?.institutionId;
    if (
      adminRecord?.role !== 'institutionAdmin' || adminRecord.status !== 'active'
      || adminRecord.mustChangePassword === true || typeof institutionId !== 'string'
    ) {
      return respond(res, 403, { error: 'Only active institution administrators can add staff or students.' });
    }

    const institutionSnapshot = await services.database.ref(`institutions/${institutionId}/status`).get();
    if (institutionSnapshot.val() !== 'active') {
      return respond(res, 403, { error: 'This institution is not active.' });
    }
    if (role === 'student') {
      const classSnapshot = await services.database.ref(`${institutionId}/classes/${classId}`).get();
      if (!classSnapshot.exists()) {
        return respond(res, 400, { error: 'Select a class in your institution.' });
      }
    }

    const createdUser = await services.auth.createUser({
      email,
      password: temporaryPassword,
      displayName,
      emailVerified: false,
      disabled: false,
    });
    const profile = {
      uid: createdUser.uid,
      email,
      displayName,
      role,
      status: 'active',
      institutionId,
      classId: role === 'student' ? classId : null,
      mustChangePassword: true,
      createdAt: ServerValue.TIMESTAMP,
    };
    const roster: Record<string, unknown> = {
      uid: createdUser.uid,
      email,
      displayName,
      status: 'active',
      createdAt: ServerValue.TIMESTAMP,
    };
    if (role === 'student') {
      roster.classId = classId;
      roster.admissionNo = admissionNo;
    }
    const updates: Record<string, unknown> = {
      [`users/${createdUser.uid}`]: profile,
      [`${institutionId}/${role === 'student' ? 'students' : 'teachers'}/${createdUser.uid}`]: roster,
    };

    try {
      await services.database.ref().update(updates);
    } catch (error) {
      try {
        await services.auth.deleteUser(createdUser.uid);
      } catch (rollbackError) {
        console.error('Could not roll back an incompletely created account:', errorCode(rollbackError));
      }
      throw error;
    }

    return respond(res, 201, { uid: createdUser.uid });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/email-already-exists') {
      return respond(res, 409, { error: 'An account already exists for this email address.' });
    }
    if (code === 'auth/invalid-password' || code === 'auth/invalid-email') {
      return respond(res, 400, { error: 'The password or email does not meet the Firebase project requirements.' });
    }
    console.error('Admin account creation failed:', errorCode(error));
    return respond(res, 500, { error: 'The account could not be created. Please retry.' });
  }
}
