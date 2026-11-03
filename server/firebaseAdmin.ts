import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

function getAdminApp() {
  const existing = getApps().find((app) => app.name === 'medresah-vercel-api');
  if (existing) return existing;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!serviceAccountJson || !databaseURL) {
    throw new Error('Firebase Admin API environment is not configured.');
  }

  const raw: unknown = JSON.parse(serviceAccountJson);
  if (!raw || typeof raw !== 'object') {
    throw new Error('Firebase Admin service account is invalid.');
  }
  const account = raw as Record<string, unknown>;
  const projectId = account.project_id;
  const clientEmail = account.client_email;
  const privateKey = account.private_key;
  if (
    typeof projectId !== 'string' || typeof clientEmail !== 'string'
    || typeof privateKey !== 'string'
  ) {
    throw new Error('Firebase Admin service account is missing required fields.');
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    databaseURL,
  }, 'medresah-vercel-api');
}

export function getAdminServices() {
  const app = getAdminApp();
  return {
    auth: getAuth(app),
    database: getDatabase(app),
  };
}
