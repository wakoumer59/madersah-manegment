// Seed script — creates the first platform owner account
//
// Usage:
//   1. Firebase Console → Project settings → Service accounts → Generate new private key
//   2. Save the JSON as firebase/serviceAccountKey.json (NOT committed to repo)
//   3. Run: node scripts/seed-admin.mjs
//
// This creates:
//   - Firebase Auth user: madresahmg1@gmail.com / 12340
//   - Realtime Database record: role = platformOwner, status = active

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import * as fs from 'fs';
import * as path from 'path';

const SERVICE_ACCOUNT_PATH = path.resolve('firebase/serviceAccountKey.json');
const DATABASE_URL = 'https://madresahmg-default-rtdb.firebaseio.com';
const SEED_EMAIL = 'madresahmg1@gmail.com';
const SEED_PASSWORD = '123400';

async function main() {
  // Check service account file exists
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('\n❌ Service account key not found!');
    console.error('   Expected at:', SERVICE_ACCOUNT_PATH);
    console.error('\n   To create it:');
    console.error('   1. Firebase Console → Project settings → Service accounts');
    console.error('   2. Click "Generate new private key"');
    console.error('   3. Save the downloaded JSON as:', SERVICE_ACCOUNT_PATH);
    process.exit(1);
  }

  // Initialize Admin SDK
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: DATABASE_URL,
    });
  }

  const auth = getAuth();
  const db = getDatabase();
  const ref = db.ref();

  console.log('🌱 Seeding platform owner...');

  try {
    // Check if user already exists
    let authUser;
    try {
      authUser = await auth.getUserByEmail(SEED_EMAIL);
      console.log(`   Auth user already exists (uid: ${authUser.uid})`);
    } catch {
      authUser = await auth.createUser({
        email: SEED_EMAIL,
        password: SEED_PASSWORD,
        emailVerified: false,
        disabled: false,
      });
      console.log(`   Created Auth user (uid: ${authUser.uid})`);
    }

    // Create/update database user record
    const userRecordRef = ref.child(`users/${authUser.uid}`);
    const snapshot = await userRecordRef.once('value');

    if (snapshot.exists()) {
      console.log(`   Database record already exists — updating role...`);
      await userRecordRef.update({
        role: 'platformOwner',
        status: 'active',
        updatedAt: Date.now(),
      });
    } else {
      await userRecordRef.set({
        uid: authUser.uid,
        email: SEED_EMAIL,
        displayName: 'Platform Owner',
        role: 'platformOwner',
        status: 'active',
        institutionId: null,
        classId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log(`   Created database record`);
    }

    console.log('\n✅ Seed complete!');
    console.log(`   Email:    ${SEED_EMAIL}`);
    console.log(`   Password: ${SEED_PASSWORD}`);
    console.log(`   Role:     platformOwner`);
    console.log('\n   You can now sign in at http://localhost:5173/login');
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    process.exit(1);
  }
}

main();