// Lazily initialized Firebase singletons. Nothing is initialized at import
// time, so the app can render a helpful configuration-error screen instead of
// crashing when .env has not been set up yet.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFirebaseConfig } from './config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;
let storage: FirebaseStorage | null = null;

function ensureApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(getFirebaseConfig());
    auth = getAuth(app);
    db = getDatabase(app);
    storage = getStorage(app);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  ensureApp();
  return auth as Auth;
}

export function getDb(): Database {
  ensureApp();
  return db as Database;
}

export function getFirebaseStorage(): FirebaseStorage {
  ensureApp();
  return storage as FirebaseStorage;
}
