// Reads the PUBLIC Firebase client configuration from environment variables.
// These values are safe to expose in the browser — all access control is
// enforced by Firebase Security Rules + Authentication, never by hiding config.

const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function getFirebaseConfig(): FirebaseClientConfig {
  const missing = REQUIRED_KEYS.filter((key) => !import.meta.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Missing environment variables: ${missing.join(', ')}. ` +
        'Copy .env.example to .env, fill in your Firebase project\'s public client config ' +
        '(Firebase Console → Project settings → Your apps → Web app), and restart the dev server.',
    );
  }
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

/** Returns a friendly configuration-error message, or null when configured. */
export function getFirebaseConfigError(): string | null {
  try {
    getFirebaseConfig();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Firebase is not configured.';
  }
}
