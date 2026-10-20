// Security Rules tests — Realtime Database (Phase 2 scope).
// Run with: npm run test:rules  (wraps `firebase emulators:exec`)
// Requires Java 11+ for the RTDB emulator (see docs/SECURITY.md).
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { get, ref, set, update } from 'firebase/database';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const OWNER = 'owner1';
const USER_A = 'userA'; // pending user (requester)
const USER_B = 'userB'; // another pending user
const ADMIN_A = 'adminA';
const ADMIN_B = 'adminB';
const STUDENT_A = 'studentA';
const INST_A = 'instA';
const INST_B = 'instB';

let env: RulesTestEnvironment;

function userRecord(
  uid: string,
  email: string,
  role: string,
  status: string,
  institutionId: string | null = null,
  classId: string | null = null,
  displayName = 'Test User',
) {
  return { uid, email, displayName, role, status, institutionId, classId, createdAt: 1000 };
}

function pendingRequest(requesterUid: string, requesterName: string, status = 'pending') {
  return {
    id: requesterUid,
    institutionName: 'Test Madrasah',
    contactEmail: 'madrasah@example.com',
    phone: '+2519234567',
    address: 'Some address',
    requesterUid,
    requesterName,
    status,
    reviewNote: '',
    reviewedBy: null,
    createdAt: 1000,
    reviewedAt: null,
  };
}

function dbFor(uid: string, email?: string) {
  return email
    ? env.authenticatedContext(uid, { email }).database()
    : env.authenticatedContext(uid).database();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-medresah',
    database: {
      rules: readFileSync('firebase/database.rules.json', 'utf8'),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.database();
    await set(ref(db, `users/${OWNER}`), userRecord(OWNER, 'owner@test.dev', 'platformOwner', 'active'));
    await set(ref(db, `users/${USER_A}`), userRecord(USER_A, 'pendA@test.dev', 'pending', 'pending'));
    await set(ref(db, `users/${USER_B}`), userRecord(USER_B, 'pendB@test.dev', 'pending', 'pending'));
    await set(ref(db, `users/${ADMIN_A}`), userRecord(ADMIN_A, 'admA@test.dev', 'institutionAdmin', 'active', INST_A));
    await set(ref(db, `users/${ADMIN_B}`), userRecord(ADMIN_B, 'admB@test.dev', 'institutionAdmin', 'active', INST_B));
    await set(ref(db, `users/${STUDENT_A}`), userRecord(STUDENT_A, 'stuA@test.dev', 'student', 'active', INST_A, 'class1'));
    await set(ref(db, `institutions/${INST_A}`), {
      id: INST_A, name: 'Madrasah A', status: 'active', contactEmail: 'a@example.com',
      phone: '1', address: 'Addr A', createdBy: ADMIN_A, createdAt: 1000, updatedAt: 1000,
    });
    await set(ref(db, `institutions/${INST_B}`), {
      id: INST_B, name: 'Madrasah B', status: 'active', contactEmail: 'b@example.com',
      phone: '2', address: 'Addr B', createdBy: ADMIN_B, createdAt: 1000, updatedAt: 1000,
    });
  });
});

describe('default deny', () => {
  it('blocks all unauthenticated reads and writes', async () => {
    const anon = env.unauthenticatedContext().database();
    await assertFails(get(ref(anon, `users/${OWNER}`)));
    await assertFails(set(ref(anon, `users/${OWNER}`), userRecord(OWNER, 'x@y.z', 'platformOwner', 'active')));
    await assertFails(get(ref(anon, 'institutions')));
    await assertFails(get(ref(anon, 'institutionRequests')));
  });

  it('denies domains that have no rules yet (students, attendance)', async () => {
    const adminDb = dbFor(ADMIN_A, 'admA@test.dev');
    await assertFails(set(ref(adminDb, `students/${INST_A}/s1`), { uid: 's1' }));
    await assertFails(set(ref(adminDb, `attendance/${INST_A}/class1/2026-10-16`), { x: 1 }));
  });
});

describe('user self-registration', () => {
  it('allows creating own record ONLY as pending/pending with matching email', async () => {
    const db = dbFor('newUser', 'new@test.dev');
    await assertSucceeds(
      set(ref(db, 'users/newUser'), userRecord('newUser', 'new@test.dev', 'pending', 'pending')),
    );
  });

  it('rejects self-create with a privileged role', async () => {
    const db = dbFor('newUser', 'new@test.dev');
    await assertFails(
      set(ref(db, 'users/newUser'), userRecord('newUser', 'new@test.dev', 'institutionAdmin', 'pending')),
    );
    await assertFails(
      set(ref(db, 'users/newUser'), userRecord('newUser', 'new@test.dev', 'platformOwner', 'pending')),
    );
  });

  it('rejects self-create carrying an institutionId', async () => {
    const db = dbFor('newUser', 'new@test.dev');
    await assertFails(
      set(ref(db, 'users/newUser'), userRecord('newUser', 'new@test.dev', 'pending', 'pending', INST_A)),
    );
  });

  it('rejects self-create with an email that does not match the auth token', async () => {
    const db = dbFor('newUser', 'other@test.dev');
    await assertFails(
      set(ref(db, 'users/newUser'), userRecord('newUser', 'new@test.dev', 'pending', 'pending')),
    );
  });

  it('rejects creating a record for someone else', async () => {
    const db = dbFor(USER_A, 'pendA@test.dev');
    await assertFails(
      set(ref(db, `users/${USER_B}`), userRecord(USER_B, 'pendB@test.dev', 'pending', 'pending')),
    );
  });

  it('rejects updating own existing record (no self role escalation)', async () => {
    const db = dbFor(USER_A, 'pendA@test.dev');
    await assertFails(update(ref(db, `users/${USER_A}`), { role: 'institutionAdmin', status: 'active' }));
  });
});

describe('platform owner powers', () => {
  it('lets the owner promote a user to institutionAdmin', async () => {
    const db = dbFor(OWNER, 'owner@test.dev');
    await assertSucceeds(
      update(ref(db, `users/${USER_A}`), { role: 'institutionAdmin', status: 'active', institutionId: INST_A }),
    );
  });

  it('lets nobody else change roles', async () => {
    const dbA = dbFor(ADMIN_A, 'admA@test.dev');
    await assertFails(update(ref(dbA, `users/${ADMIN_A}`), { role: 'platformOwner' }));
    await assertFails(update(ref(dbA, `users/${STUDENT_A}`), { role: 'institutionAdmin' }));
    const pendDb = dbFor(USER_A, 'pendA@test.dev');
    await assertFails(update(ref(pendDb, `users/${USER_B}`), { role: 'teacher' }));
  });
});

describe('institution requests', () => {
  it('lets a pending user submit their own request', async () => {
    const db = dbFor(USER_A, 'pendA@test.dev');
    await assertSucceeds(set(ref(db, `institutionRequests/${USER_A}`), pendingRequest(USER_A, 'Test User')));
  });

  it('rejects self-approve on submit (status must be pending)', async () => {
    const db = dbFor(USER_A, 'pendA@test.dev');
    const approved = { ...pendingRequest(USER_A, 'Test User'), status: 'approved' };
    await assertFails(set(ref(db, `institutionRequests/${USER_A}`), approved));
  });

  it('rejects requests claiming another requester uid', async () => {
    const db = dbFor(USER_A, 'pendA@test.dev');
    await assertFails(set(ref(db, `institutionRequests/${USER_A}`), pendingRequest(USER_B, 'Test User')));
  });

  it('rejects request creation by non-pending users', async () => {
    const db = dbFor(STUDENT_A, 'stuA@test.dev');
    await assertFails(set(ref(db, `institutionRequests/${STUDENT_A}`), pendingRequest(STUDENT_A, 'Test User')));
  });

  it('lets the owner approve atomically: request + institution + promotion', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `institutionRequests/${USER_A}`), pendingRequest(USER_A, 'Test User'));
    });
    const db = dbFor(OWNER, 'owner@test.dev');
    await assertSucceeds(
      update(ref(db), {
        [`institutionRequests/${USER_A}/status`]: 'approved',
        [`institutionRequests/${USER_A}/reviewedBy`]: OWNER,
        [`institutionRequests/${USER_A}/reviewedAt`]: 2000,
        [`institutions/${INST_A}X`]: {
          id: `${INST_A}X`, name: 'Test Madrasah', status: 'active', contactEmail: 'madrasah@example.com',
          phone: '+2511234567', address: 'Some address', createdBy: USER_A, createdAt: 2000, updatedAt: 2000,
        },
        [`users/${USER_A}/role`]: 'institutionAdmin',
        [`users/${USER_A}/status`]: 'active',
        [`users/${USER_A}/institutionId`]: `${INST_A}X`,
      }),
    );
    // Verify all three writes landed (atomic update)
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db2 = ctx.database();
      const inst = await get(ref(db2, `institutions/${INST_A}X`));
      const user = await get(ref(db2, `users/${USER_A}`));
      const req = await get(ref(db2, `institutionRequests/${USER_A}/status`));
      if (inst.val()?.status !== 'active') throw new Error('institution not created');
      if (user.val()?.role !== 'institutionAdmin') throw new Error('user not promoted');
      if (req.val() !== 'approved') throw new Error('request not marked approved');
    });
  });

  it('blocks non-owners from reviewing requests', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `institutionRequests/${USER_A}`), pendingRequest(USER_A, 'Test User'));
    });
    const db = dbFor(ADMIN_A, 'admA@test.dev');
    await assertFails(set(ref(db, `institutionRequests/${USER_A}/status`), 'approved'));
  });

  it('lets the owner reject with a note, and the user re-submit afterwards', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `institutionRequests/${USER_A}`), pendingRequest(USER_A, 'Test User'));
    });
    const ownerDb = dbFor(OWNER, 'owner@test.dev');
    await assertSucceeds(
      update(ref(ownerDb, `institutionRequests/${USER_A}`), {
        status: 'rejected', reviewNote: 'Need more info', reviewedBy: OWNER, reviewedAt: 2000,
      }),
    );
    const userDb = dbFor(USER_A, 'pendA@test.dev');
    await assertSucceeds(set(ref(userDb, `institutionRequests/${USER_A}`), pendingRequest(USER_A, 'Test User')));
  });

  it('enforces request read privacy', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `institutionRequests/${USER_A}`), pendingRequest(USER_A, 'Test User'));
    });
    await assertSucceeds(get(ref(dbFor(USER_A, 'pendA@test.dev'), `institutionRequests/${USER_A}`)));
    await assertFails(get(ref(dbFor(USER_B, 'pendB@test.dev'), `institutionRequests/${USER_A}`)));
    await assertSucceeds(get(ref(dbFor(OWNER, 'owner@test.dev'), 'institutionRequests')));
  });
});

describe('institutions & tenant isolation', () => {
  it('lets an admin update own institution profile but never its status', async () => {
    const db = dbFor(ADMIN_A, 'admA@test.dev');
    await assertSucceeds(update(ref(db, `institutions/${INST_A}`), { name: 'Madrasah A Renamed' }));
    await assertFails(update(ref(db, `institutions/${INST_A}`), { status: 'suspended' }));
  });

  it('lets nobody but the owner touch another institution', async () => {
    const db = dbFor(ADMIN_A, 'admA@test.dev');
    await assertFails(update(ref(db, `institutions/${INST_B}`), { name: 'Hijacked' }));
    const studentDb = dbFor(STUDENT_A, 'stuA@test.dev');
    await assertFails(update(ref(studentDb, `institutions/${INST_A}`), { name: 'Nope' }));
    await assertFails(set(ref(studentDb, 'institutions/instC'), { id: 'instC', name: 'Fake', status: 'active' }));
  });

  it('lets the owner suspend and reactivate institutions', async () => {
    const db = dbFor(OWNER, 'owner@test.dev');
    await assertSucceeds(update(ref(db, `institutions/${INST_A}`), { status: 'suspended' }));
    await assertSucceeds(update(ref(db, `institutions/${INST_A}`), { status: 'active' }));
  });

  it('blocks all staff writes while an institution is suspended', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await update(ref(ctx.database(), `institutions/${INST_A}`), { status: 'suspended' });
    });
    const db = dbFor(ADMIN_A, 'admA@test.dev');
    await assertFails(update(ref(db, `institutions/${INST_A}`), { name: 'While suspended' }));
  });

  it('enforces institution read visibility', async () => {
    await assertSucceeds(get(ref(dbFor(ADMIN_A, 'admA@test.dev'), `institutions/${INST_A}`)));
    await assertFails(get(ref(dbFor(ADMIN_A, 'admA@test.dev'), `institutions/${INST_B}`)));
    await assertSucceeds(get(ref(dbFor(OWNER, 'owner@test.dev'), 'institutions')));
  });
});

describe('institution admin user management', () => {
  it('lets an admin manage own-institution users but not their role or tenant', async () => {
    const db = dbFor(ADMIN_A, 'admA@test.dev');
    await assertSucceeds(update(ref(db, `users/${STUDENT_A}`), { status: 'inactive' }));
    await assertFails(update(ref(db, `users/${STUDENT_A}`), { role: 'institutionAdmin' }));
    await assertFails(update(ref(db, `users/${STUDENT_A}`), { institutionId: INST_B }));
    await assertFails(update(ref(db, `users/${STUDENT_A}`), { email: 'changed@test.dev' }));
  });

  it('lets an admin manage users of their own institution only', async () => {
    const db = dbFor(ADMIN_A, 'admA@test.dev');
    await assertFails(update(ref(db, `users/${ADMIN_B}`), { status: 'inactive' }));
    await assertFails(update(ref(db, `users/${ADMIN_B}`), { role: 'student' }));
  });

  it('nobody can edit the platform owner', async () => {
    const db = dbFor(ADMIN_A, 'admA@test.dev');
    await assertFails(update(ref(db, `users/${OWNER}`), { status: 'inactive' }));
  });

  it('lets an admin read own-institution users but not other institutions', async () => {
    await assertSucceeds(get(ref(dbFor(ADMIN_A, 'admA@test.dev'), `users/${STUDENT_A}`)));
    await assertFails(get(ref(dbFor(ADMIN_A, 'admA@test.dev'), `users/${ADMIN_B}`)));
    await assertFails(get(ref(dbFor(STUDENT_A, 'stuA@test.dev'), `users/${STUDENT_A}x`)));
  });
});





