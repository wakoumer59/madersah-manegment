import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAdminServices } from '../server/firebaseAdmin.js';
import {
  buildHelpChatSystemPrompt,
  parseHelpChatMessages,
  type HelpChatRole,
} from '../server/helpChat.js';

interface ApiRequest extends IncomingMessage {
  body?: unknown;
}

function respond(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(body));
}

function readBody(req: ApiRequest): unknown {
  if (typeof req.body !== 'string') return req.body;
  try {
    return JSON.parse(req.body) as unknown;
  } catch {
    return null;
  }
}

function getBearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function isHelpChatRole(role: unknown): role is HelpChatRole {
  return role === 'platformOwner'
    || role === 'institutionAdmin'
    || role === 'teacher'
    || role === 'student';
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { error: 'Method not allowed.' });
  }

  const token = getBearerToken(req);
  if (!token) return respond(res, 401, { error: 'Sign in to use System Help.' });

  const body = readBody(req);
  const messages =
    body && typeof body === 'object' && 'messages' in body
      ? parseHelpChatMessages(body.messages)
      : null;
  if (!messages) return respond(res, 400, { error: 'Enter a message and try again.' });

  let services: ReturnType<typeof getAdminServices>;
  try {
    services = getAdminServices();
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : 'configuration';
    console.error('System Help authentication service configuration failed:', code);
    return respond(res, 503, { error: 'System Help is temporarily unavailable.' });
  }

  let uid: string;
  try {
    uid = (await services.auth.verifyIdToken(token, true)).uid;
  } catch {
    return respond(res, 401, { error: 'Your session expired. Sign in again to continue.' });
  }

  let userRecord: Record<string, unknown> | null;
  try {
    const snapshot = await services.database.ref(`users/${uid}`).get();
    userRecord = snapshot.val() as Record<string, unknown> | null;
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : 'database';
    console.error('System Help user verification failed:', code);
    return respond(res, 503, { error: 'System Help is temporarily unavailable.' });
  }

  if (
    !userRecord ||
    userRecord.status !== 'active' ||
    userRecord.mustChangePassword === true ||
    !isHelpChatRole(userRecord.role)
  ) {
    return respond(res, 403, { error: 'Your account is not allowed to use System Help.' });
  }

  if (userRecord.role !== 'platformOwner') {
    if (typeof userRecord.institutionId !== 'string' || !userRecord.institutionId) {
      return respond(res, 403, { error: 'Your account is not allowed to use System Help.' });
    }

    let institutionStatus: unknown;
    try {
      const snapshot = await services.database
        .ref(`institutions/${userRecord.institutionId}/status`)
        .get();
      institutionStatus = snapshot.val();
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : 'database';
      console.error('System Help institution verification failed:', code);
      return respond(res, 503, { error: 'System Help is temporarily unavailable.' });
    }
    if (institutionStatus !== 'active') {
      return respond(res, 403, { error: 'Your account is not allowed to use System Help.' });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return respond(res, 503, {
      error: 'AI System Help is not configured yet. Ask your platform administrator to configure it.',
    });
  }

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildHelpChatSystemPrompt(userRecord.role) },
          ...messages,
        ],
        max_tokens: 700,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    const code = error instanceof Error ? error.name : 'unknown';
    console.error('System Help AI request failed:', code);
    return respond(res, 502, { error: 'System Help could not answer right now. Please try again.' });
  }

  if (!response.ok) {
    console.error(`System Help AI provider returned status ${response.status}.`);
    return respond(res, 502, { error: 'System Help could not answer right now. Please try again.' });
  }

  let answer: unknown;
  try {
    const payload: unknown = await response.json();
    answer = payload &&
      typeof payload === 'object' &&
      'choices' in payload &&
      Array.isArray(payload.choices) &&
      payload.choices[0] &&
      typeof payload.choices[0] === 'object' &&
      'message' in payload.choices[0] &&
      payload.choices[0].message &&
      typeof payload.choices[0].message === 'object' &&
      'content' in payload.choices[0].message
      ? payload.choices[0].message.content
      : null;
  } catch {
    return respond(res, 502, { error: 'System Help returned an invalid response. Please try again.' });
  }

  if (typeof answer !== 'string' || !answer.trim() || answer.length > 5000) {
    return respond(res, 502, { error: 'System Help returned an invalid response. Please try again.' });
  }
  return respond(res, 200, { answer: answer.trim() });
}
