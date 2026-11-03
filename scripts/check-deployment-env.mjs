import { loadEnv } from 'vite';

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FIREBASE_DATABASE_URL',
];

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const missingKeys = requiredKeys.filter((key) => !env[key]?.trim());

let serviceAccountValid = false;
if (env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
  try {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    serviceAccountValid = Boolean(
      serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key,
    );
  } catch {
    serviceAccountValid = false;
  }
}

if (missingKeys.length > 0 || !serviceAccountValid) {
  const serviceAccountError = serviceAccountValid
    ? ''
    : 'FIREBASE_SERVICE_ACCOUNT_JSON must be valid service-account JSON with project_id, client_email, and private_key.';
  console.error(
    [
      missingKeys.length > 0
        ? `Missing Firebase deployment environment variables: ${missingKeys.join(', ')}.`
        : '',
      serviceAccountError,
      'Set them in the deployment platform or in a local .env file before building.',
    ].filter(Boolean).join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log('Firebase client and Admin API deployment environment is configured.');
}
