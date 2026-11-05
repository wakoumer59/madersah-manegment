import { Buffer } from 'node:buffer';

interface CachedToken {
  value: string;
  expiresAt: number;
}

type QuranEnvironment = 'production' | 'prelive';

let cachedToken: CachedToken | null = null;
let tokenRequest: Promise<string> | null = null;

function getQuranEnvironment(): QuranEnvironment {
  const value = process.env.QF_ENV?.trim() || 'production';
  if (value !== 'production' && value !== 'prelive') {
    throw new Error('QF_ENV must be either "production" or "prelive".');
  }
  return value;
}

function getCredentials() {
  const clientId = process.env.QF_CLIENT_ID?.trim();
  const clientSecret = process.env.QF_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Quran Foundation API credentials are not configured.');
  }
  return { clientId, clientSecret };
}

async function requestAccessToken(): Promise<string> {
  const environment = getQuranEnvironment();
  const { clientId, clientSecret } = getCredentials();
  const authBase = environment === 'prelive'
    ? 'https://prelive-oauth2.quran.foundation'
    : 'https://oauth2.quran.foundation';
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${authBase}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'content',
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Quran Foundation authentication failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('access_token' in payload) ||
    typeof payload.access_token !== 'string' ||
    !('expires_in' in payload) ||
    typeof payload.expires_in !== 'number'
  ) {
    throw new Error('Quran Foundation returned an invalid access token response.');
  }

  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(0, payload.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) cachedToken = null;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  tokenRequest ??= requestAccessToken().finally(() => {
    tokenRequest = null;
  });
  return tokenRequest;
}

export async function fetchQuranContent(path: string): Promise<Response> {
  const environment = getQuranEnvironment();
  const { clientId } = getCredentials();
  const apiBase = environment === 'prelive'
    ? 'https://apis-prelive.quran.foundation'
    : 'https://apis.quran.foundation';
  let token = await getAccessToken();
  let response = await fetch(`${apiBase}/content/api/v4${path}`, {
    headers: {
      'x-auth-token': token,
      'x-client-id': clientId,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 401) {
    token = await getAccessToken(true);
    response = await fetch(`${apiBase}/content/api/v4${path}`, {
      headers: {
        'x-auth-token': token,
        'x-client-id': clientId,
      },
      signal: AbortSignal.timeout(15_000),
    });
  }
  return response;
}
