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
const LOCKED_STUDENT = 'lockedStudent';
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
    await set(ref(db, `users/${LOCKED_STUDENT}`), {
      ...userRecord(LOCKED_STUDENT, 'locked@test.dev', 'student', 'active', INST_A, 'class1'),
      mustChangePassword: true,
    });
    await set(ref(db, `${INST_A}/students/${STUDENT_A}`), {
      uid: STUDENT_A, displayName: 'Test Student', email: 'stuA@test.dev',
      classId: 'class1', admissionNo: 'ADM-1', status: 'active', createdAt: 1000,
    });
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

  it('denies unscoped student writes and scopes attendance by institution', async () => {
    const adminDb = dbFor(ADMIN_A, 'admA@test.dev');
    await assertFails(set(ref(adminDb, `students/${INST_A}/s1`), { uid: 's1' }));
    await assertSucceeds(set(
      ref(adminDb, `${INST_A}/attendance/class1/2026-10-16/${STUDENT_A}`),
      { status: 'present', markedBy: ADMIN_A, updatedAt: 1000 },
    ));
    await assertFails(set(
      ref(adminDb, `${INST_B}/attendance/class1/2026-10-16/${STUDENT_A}`),
      { status: 'present', markedBy: ADMIN_A, updatedAt: 1000 },
    ));
  });
});

describe('student management', () => {
  it('lets an institution admin edit and remove a student in their own institution', async () => {
    const adminDb = dbFor(ADMIN_A, 'admA@test.dev');
    await assertSucceeds(update(ref(adminDb), {
      [`${INST_A}/students/${STUDENT_A}/displayName`]: 'Updated Student',
      [`${INST_A}/students/${STUDENT_A}/classId`]: 'class2',
      [`${INST_A}/students/${STUDENT_A}/admissionNo`]: 'ADM-2',
      [`users/${STUDENT_A}/displayName`]: 'Updated Student',
      [`users/${STUDENT_A}/classId`]: 'class2',
    }));
    await assertSucceeds(get(ref(adminDb, `${INST_A}/students/${STUDENT_A}`)));
    await assertFails(update(ref(dbFor(ADMIN_B, 'admB@test.dev')), {
      [`${INST_A}/students/${STUDENT_A}/displayName`]: 'Cross-tenant edit',
      [`users/${STUDENT_A}/displayName`]: 'Cross-tenant edit',
    }));

    await assertSucceeds(update(ref(adminDb), {
      [`${INST_A}/students/${STUDENT_A}`]: null,
      [`users/${STUDENT_A}`]: null,
    }));
  });
});

describe('temporary password access', () => {
  it('lets a temporary-password user read their profile but blocks tenant data', async () => {
    const lockedDb = dbFor(LOCKED_STUDENT, 'locked@test.dev');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), 'pendingAccounts/legacy-code'), {
        code: 'legacy-code',
        email: 'locked@test.dev',
        displayName: 'Locked Student',
        role: 'student',
        institutionId: INST_A,
        classId: 'class1',
        status: 'unused',
        usedBy: null,
        createdBy: ADMIN_A,
        createdAt: 1000,
      });
    });
    await assertSucceeds(get(ref(lockedDb, `users/${LOCKED_STUDENT}`)));
    await assertFails(update(ref(lockedDb, `users/${LOCKED_STUDENT}`), { mustChangePassword: false }));
    await assertFails(get(ref(lockedDb, `${INST_A}/classes`)));
    await assertFails(get(ref(lockedDb, `${INST_A}/testCatalog`)));
    await assertFails(get(ref(lockedDb, 'pendingAccounts/legacy-code')));
    await assertFails(update(ref(lockedDb, 'pendingAccounts/legacy-code'), {
      status: 'used',
      usedBy: LOCKED_STUDENT,
    }));
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

describe('tenant data access', () => {
  it('allows staff access only within their active institution', async () => {
    const adminDb = dbFor(ADMIN_A, 'admA@test.dev');
    await assertSucceeds(set(ref(adminDb, `${INST_A}/classes/class1`), {
      id: 'class1', name: 'Grade 1', academicYear: '2026/2027',
      teacherUid: null, studentCount: 0, createdAt: 1000,
    }));
    await assertFails(get(ref(adminDb, `${INST_B}/classes`)));
    await assertFails(set(ref(adminDb, `${INST_B}/classes/class1`), {
      id: 'class1', name: 'Hijacked', academicYear: '2026/2027',
      teacherUid: null, studentCount: 0, createdAt: 1000,
    }));
  });

  it('exposes only the published student question copy before submission', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database();
      await set(ref(db, `${INST_A}/testCatalog/test1`), {
        id: 'test1', title: 'Test', description: '', classId: 'class1',
        subjectId: null, startTime: 0, endTime: Date.now() + 60_000,
        durationMin: 30, maxScore: 1, status: 'published',
        showResults: false, questionCount: 1, createdBy: ADMIN_A, createdAt: 1000,
      });
      await set(ref(db, `${INST_A}/tests/test1/_questions/q1`), {
        id: 'q1', type: 'mcq', text: 'Question?', options: { A: 'Answer' }, correct: 'A',
      });
      await set(ref(db, `${INST_A}/tests/test1/_studentQuestions/q1`), {
        id: 'q1', type: 'mcq', text: 'Question?', options: { A: 'Answer' },
      });
    });

    const studentDb = dbFor(STUDENT_A, 'stuA@test.dev');
    await assertSucceeds(get(ref(studentDb, `${INST_A}/testCatalog`)));
    await assertSucceeds(get(ref(studentDb, `${INST_A}/tests/test1/_studentQuestions`)));
    await assertFails(get(ref(studentDb, `${INST_A}/tests/test1/_questions`)));
    await assertSucceeds(set(ref(studentDb, `${INST_A}/tests/test1/_attempts/${STUDENT_A}`), {
      testId: 'test1', studentUid: STUDENT_A, answers: { q1: 'A' },
      startedAt: Date.now(), submittedAt: Date.now(), status: 'submitted',
    }));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `${INST_A}/tests/test1/_results/${STUDENT_A}`), {
        score: 1, total: 1, gradedAt: Date.now(), method: 'client',
      });
    });
    await assertSucceeds(get(ref(studentDb, `${INST_A}/tests/test1/_attempts/${STUDENT_A}`)));
    await assertSucceeds(get(ref(studentDb, `${INST_A}/tests/test1/_questions`)));
    await assertFails(get(ref(studentDb, `${INST_A}/tests/test1/_results/${STUDENT_A}`)));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await update(ref(ctx.database(), `${INST_A}/testCatalog/test1`), { showResults: true });
    });
    await assertSucceeds(get(ref(studentDb, `${INST_A}/tests/test1/_results/${STUDENT_A}`)));
    await assertFails(get(ref(studentDb, `${INST_A}/tests/test1/_results/${STUDENT_A}x`)));
    await assertFails(get(ref(studentDb, `${INST_B}/testCatalog`)));
  });

  it('allows a student to read answers only after submitting their own attempt', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database();
      await set(ref(db, `${INST_A}/testCatalog/test1`), {
        id: 'test1', classId: 'class1', status: 'published',
        startTime: 0, endTime: Date.now() + 60_000, showResults: true,
      });
      await set(ref(db, `${INST_A}/tests/test1/_questions/q1`), {
        id: 'q1', type: 'mcq', text: 'Question?', options: { A: 'Answer' }, correct: 'A',
      });
    });

    const studentDb = dbFor(STUDENT_A, 'stuA@test.dev');
    const attemptRef = ref(studentDb, `${INST_A}/tests/test1/_attempts/${STUDENT_A}`);
    await assertFails(get(ref(studentDb, `${INST_A}/tests/test1/_questions`)));
    await assertSucceeds(set(attemptRef, {
      testId: 'test1', studentUid: STUDENT_A, answers: { q1: 'A' },
      startedAt: Date.now(), submittedAt: Date.now(), status: 'submitted',
    }));
    await assertSucceeds(get(ref(studentDb, `${INST_A}/tests/test1/_questions`)));
    await assertFails(get(ref(dbFor(STUDENT_A, 'stuA@test.dev'), `${INST_B}/tests/test1/_questions`)));
  });
});

describe('activation codes', () => {
  const activationCode = 'MDR-ABC123';
  const account = {
    code: activationCode,
    email: 'pendA@test.dev',
    displayName: 'Test User',
    role: 'student',
    institutionId: INST_A,
    classId: null,
    status: 'unused',
    usedBy: null,
    createdBy: ADMIN_A,
    createdAt: 1000,
  };

  it('scopes code listings to the creating institution', async () => {
    const adminDb = dbFor(ADMIN_A, 'admA@test.dev');
    await assertSucceeds(update(ref(adminDb), {
      [`pendingAccounts/${activationCode}`]: account,
      [`pendingAccountsByInstitution/${INST_A}/${activationCode}`]: account,
    }));
    await assertSucceeds(get(ref(adminDb, `pendingAccountsByInstitution/${INST_A}`)));
    await assertFails(get(ref(dbFor(ADMIN_B, 'admB@test.dev'), `pendingAccountsByInstitution/${INST_A}`)));
    await assertFails(get(ref(dbFor(USER_B, 'pendB@test.dev'), `pendingAccounts/${activationCode}`)));
  });

  it('only lets the matching account activate and redeem its code', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database();
      await set(ref(db, `pendingAccounts/${activationCode}`), account);
      await set(ref(db, `pendingAccountsByInstitution/${INST_A}/${activationCode}`), account);
    });

    const pendingDb = dbFor(USER_A, 'pendA@test.dev');
    await assertSucceeds(update(ref(pendingDb, `users/${USER_A}`), {
      activationCode,
      role: 'student',
      status: 'active',
      institutionId: INST_A,
      displayName: 'Test User',
    }));
    await assertSucceeds(update(ref(pendingDb), {
      [`pendingAccounts/${activationCode}/status`]: 'used',
      [`pendingAccounts/${activationCode}/usedBy`]: USER_A,
      [`pendingAccountsByInstitution/${INST_A}/${activationCode}/status`]: 'used',
      [`pendingAccountsByInstitution/${INST_A}/${activationCode}/usedBy`]: USER_A,
    }));

    const otherDb = dbFor(USER_B, 'pendB@test.dev');
    await assertFails(update(ref(otherDb, `users/${USER_B}`), {
      activationCode,
      role: 'student',
      status: 'active',
      institutionId: INST_A,
      displayName: 'Test User',
    }));
  });

  it('creates a teacher roster entry atomically when the invited teacher activates', async () => {
    const teacherCode = 'MDR-TEACH1';
    const teacherAccount = {
      ...account,
      code: teacherCode,
      role: 'teacher',
    };
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database();
      await set(ref(db, `pendingAccounts/${teacherCode}`), teacherAccount);
      await set(ref(db, `pendingAccountsByInstitution/${INST_A}/${teacherCode}`), teacherAccount);
    });

    const pendingDb = dbFor(USER_A, 'pendA@test.dev');
    await assertSucceeds(update(ref(pendingDb), {
      [`users/${USER_A}/role`]: 'teacher',
      [`users/${USER_A}/institutionId`]: INST_A,
      [`users/${USER_A}/classId`]: null,
      [`users/${USER_A}/status`]: 'active',
      [`users/${USER_A}/activationCode`]: teacherCode,
      [`users/${USER_A}/displayName`]: 'Test User',
      [`${INST_A}/teachers/${USER_A}`]: {
        uid: USER_A,
        displayName: 'Test User',
        email: 'pendA@test.dev',
        status: 'active',
        createdAt: Date.now(),
        activationCode: teacherCode,
      },
      [`pendingAccounts/${teacherCode}/status`]: 'used',
      [`pendingAccounts/${teacherCode}/usedBy`]: USER_A,
      [`pendingAccountsByInstitution/${INST_A}/${teacherCode}/status`]: 'used',
      [`pendingAccountsByInstitution/${INST_A}/${teacherCode}/usedBy`]: USER_A,
    }));

    await assertSucceeds(get(ref(pendingDb, `${INST_A}/teachers/${USER_A}`)));
    await assertFails(get(ref(dbFor(USER_A, 'pendA@test.dev'), `${INST_B}/teachers/${USER_A}`)));
  });

  it('creates a student roster entry only for the matching student invitation', async () => {
    const studentCode = 'MDR-STUD01';
    const studentAccount = {
      ...account,
      code: studentCode,
      classId: 'class1',
      admissionNo: 'ADM-101',
    };
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database();
      await set(ref(db, `pendingAccounts/${studentCode}`), studentAccount);
      await set(ref(db, `pendingAccountsByInstitution/${INST_A}/${studentCode}`), studentAccount);
    });

    const pendingDb = dbFor(USER_A, 'pendA@test.dev');
    await assertSucceeds(update(ref(pendingDb), {
      [`users/${USER_A}/role`]: 'student',
      [`users/${USER_A}/institutionId`]: INST_A,
      [`users/${USER_A}/classId`]: 'class1',
      [`users/${USER_A}/status`]: 'active',
      [`users/${USER_A}/activationCode`]: studentCode,
      [`users/${USER_A}/displayName`]: 'Test User',
      [`${INST_A}/students/${USER_A}`]: {
        uid: USER_A,
        displayName: 'Test User',
        email: 'pendA@test.dev',
        classId: 'class1',
        admissionNo: 'ADM-101',
        status: 'active',
        createdAt: Date.now(),
        activationCode: studentCode,
      },
      [`pendingAccounts/${studentCode}/status`]: 'used',
      [`pendingAccounts/${studentCode}/usedBy`]: USER_A,
      [`pendingAccountsByInstitution/${INST_A}/${studentCode}/status`]: 'used',
      [`pendingAccountsByInstitution/${INST_A}/${studentCode}/usedBy`]: USER_A,
    }));

    await assertSucceeds(get(ref(pendingDb, `${INST_A}/students/${USER_A}`)));
    await assertFails(get(ref(dbFor(USER_A, 'pendA@test.dev'), `${INST_B}/students/${USER_A}`)));
  });
});
