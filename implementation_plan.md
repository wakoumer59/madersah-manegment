# Implementation Plan — Multi-Madrasah Learning Platform ("medresahMG")

## [Overview]

Build a production-oriented, lightweight, mobile-first Learning Management System for multiple
independent madrasahs (multi-tenant) using React + TypeScript + Vite + Tailwind CSS v4 on the
frontend and Firebase (Authentication, Realtime Database, Storage) as the backend, deployed to
Vercel — implemented incrementally in 7 testable phases, prioritizing **security → correctness →
performance → simplicity → maintainability → low cost**.

Key decisions confirmed with the stakeholder:

- **Authentication is email + password** (Firebase Authentication, Email/Password provider).
  This removes the need for paid SMS, phone verification, or Cloud Functions–backed custom
  tokens in v1.
- **UI language: English only in v1**, structured so Amharic/Afan Oromo can be added later
  without rework (all user-facing strings kept in one plain `strings.ts` module — not a heavy
  i18n library).
- **Styling: Tailwind CSS v4** via the official `@tailwindcss/vite` plugin (zero PostCSS config,
  CSS-first `@theme` configuration, small production output).
- **No Cloud Functions required for v1.** All enforcement is done with Firebase Realtime
  Database Security Rules, Storage Security Rules, and strictly validated client writes. Known
  trust trade-offs (client-side auto-grading) are documented below with an upgrade path.

The app is greenfield: `d:\medresahMG` is empty, so the project is initialized from scratch. No
Firebase credentials exist yet; the code reads them from environment variables, and
`.env.example` + setup docs are provided. Nothing can be live-tested against real Firebase
until the stakeholder creates a Firebase project and pastes the public client config.

---

## [Types]

Single source of truth: `d:\medresahMG\src\types\index.ts` (split into per-domain files only if
it exceeds ~500 lines).

```ts
// Roles & tenancy
export type UserRole = 'platformOwner' | 'institutionAdmin' | 'teacher' | 'student' | 'pending';
export type UserStatus = 'pending' | 'active' | 'inactive' | 'suspended';
export type InstitutionStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface Institution {
  id: string;                    // immutable push id
  name: string;
  status: InstitutionStatus;
  contactEmail: string;
  phone: string;
  address: string;
  createdBy: string;             // uid
  createdAt: number;             // server timestamp
  updatedAt: number;
}

export interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  institutionId: string | null;  // null only for platformOwner / pre-approval pending users
  classId: string | null;        // students only
  createdAt: number;
}

// Institution-owned entities live under /{institutionId}/... (institutionId implied by path)
export interface Student {
  uid: string;                   // same as Firebase Auth uid — single identity record
  displayName: string;
  email: string;
  classId: string;
  admissionNo: string;
  status: UserStatus;
  createdAt: number;
}
export interface Teacher {
  uid: string;
  displayName: string;
  email: string;
  status: UserStatus;
  createdAt: number;
}
export interface SchoolClass {
  id: string;
  name: string;                  // e.g. "Grade 7A"
  academicYear: string;          // e.g. "2026/2027"
  teacherUid: string | null;     // class teacher (assigned by admin)
  studentCount: number;          // denormalized counter, transaction-maintained
  createdAt: number;
}
export interface Subject {
  id: string;
  name: string;
  classId: string;
  teacherUid: string | null;
  createdAt: number;
}

// Attendance — one node per (institution, class, date, student); keying prevents duplicates
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export interface AttendanceEntry {
  status: AttendanceStatus;
  note?: string;
  markedBy: string;              // uid
  updatedAt: number;             // server timestamp
}
export interface AttendanceDayMeta {
  markedBy: string;
  markedAt: number;
  counts: { present: number; absent: number; late: number; excused: number };
}

// Tests
export type QuestionType = 'mcq' | 'truefalse';
export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: Record<string, string>;   // mcq {A,B,C,D}; truefalse {A:'True',B:'False'}
}
export interface QuestionWithAnswer extends Question { correct: 'A'|'B'|'C'|'D'; }
export type TestStatus = 'draft' | 'published' | 'closed';
export interface Test {
  id: string;
  title: string;
  description: string;
  classId: string;
  subjectId: string | null;
  startTime: number;             // epoch ms — validated against server `now` in rules
  endTime: number;
  durationMin: number;           // UX + eligibility; rules enforce real deadline
  maxScore: number;              // default = question count
  status: TestStatus;
  showResults: boolean;          // result visibility to students
  questionCount: number;
  createdBy: string;
  createdAt: number;
}
export interface TestAttempt {
  testId: string;
  studentUid: string;
  answers: Record<string, 'A'|'B'|'C'|'D'>;  // questionId -> choice
  startedAt: number;
  submittedAt: number;
  status: 'in_progress' | 'submitted';        // 'in_progress' = draft autosave
}
export interface TestResult {
  score: number;
  total: number;
  gradedAt: number;
  method: 'auto';               // future: 'server' when Cloud Functions added
}

export interface Material {
  id: string;
  title: string;
  description: string;
  classId: string | null;        // null = whole institution
  subjectId: string | null;
  visibility: 'class' | 'institution';
  fileName: string;
  contentType: string;
  size: number;                  // bytes
  storagePath: string;
  uploadedBy: string;
  createdAt: number;
  downloadCount: number;         // best-effort, transaction-maintained
}

export interface InstitutionRequest {
  id: string;
  institutionName: string;
  contactEmail: string;
  phone: string;
  address: string;
  requesterUid: string;          // uid of the person who will become institutionAdmin
  requesterName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string;
  reviewedBy: string | null;
  createdAt: number;
  reviewedAt: number | null;
}

// Activation/invite code (replaces paid SMS; student & teacher onboarding)
export interface PendingAccount {
  code: string;                  // short human-typable code, e.g. "MDR-7K2Q9"
  email: string;
  displayName: string;
  role: 'student' | 'teacher';
  institutionId: string;
  classId: string | null;
  status: 'unused' | 'used';
  createdBy: string;
  createdAt: number;
  usedBy: string | null;
}

// UI/helper types
export interface Paged<T> { items: T[]; cursor: string | null; hasMore: boolean; }
export interface DashboardStats {
  totalStudents: number; totalTeachers: number;
  presentToday: number; absentToday: number;
  activeTests: number; materialCount: number;
}
```

---

## [Database Schema]  (Firebase Realtime Database)

Design rationale: every institution-owned record lives **under its institution node**, so the
Security Rules can grant/deny an entire subtree with one path check
(`root.child('users').child(auth.uid).child('institutionId').val() === $institutionId`) — the
cheapest and hardest-to-bypass tenant-isolation primitive in RTDB. Cross-institution data
(platform requests, users index) lives at the root with narrow, field-validated rules.
No large object is duplicated across locations; only small denormalized counters are maintained.

```
/institutions
  /{institutionId}                     // profile + status
      name, status, contactEmail, phone, address, createdBy, createdAt, updatedAt
      /stats                           // denormalized: dashboards never download all students
          studentCount, teacherCount, classCount, materialCount
      /attendanceMeta
      /{YYYY-MM-DD}                    // tiny per-day rollup across classes
          present, absent, late, excused

/users
  /{uid}                               // one record per auth account; role NEVER user-editable
      email, displayName, role, status, institutionId, classId, createdAt

/institutionRequests
  /{requestId}                         // public "submit" + platformOwner-only review
      institutionName, contactEmail, phone, address,
      requesterUid, requesterName, status, reviewNote, reviewedBy, createdAt, reviewedAt

/pendingAccounts
  /{code}                              // admin-created activation/invite codes
      email, displayName, role, institutionId, classId, status, createdBy, createdAt, usedBy

/{institutionId}                       // ALL tenant data namespaced by immutable institutionId
  /students/{studentUid}               // uid == auth uid (no separate id to sync)
  /teachers/{teacherUid}
  /classes/{classId}
  /subjects/{subjectId}
  /attendance/{classId}/{YYYY-MM-DD}/{studentUid}    // path-keyed => duplicate-proof
  /attendance/{classId}/{YYYY-MM-DD}/_meta           // AttendanceDayMeta
  /tests/{testId}                                  // Test metadata only (NO questions/answers)
  /tests/{testId}/_questions/{questionId}           // Question (no answer key)
  /tests/{testId}/_answers/{questionId}             // correct choice — staff-only, student-read only AFTER submit
  /tests/{testId}/_attempts/{studentUid}            // TestAttempt — student create-once
  /tests/{testId}/_results/{studentUid}             // TestResult — create-once after submit
  /materials/{materialId}                           // Material metadata
```

Storage layout (Firebase Storage):

```
materials/{institutionId}/{materialId}/{originalFileName}
```

Access to any Storage object requires the requesting uid's `/users/{uid}` record to have
`institutionId === $institutionId` and role in (institutionAdmin, teacher) for writes; students
read objects of their own institution (class-scoping enforced via RTDB metadata in app +
documented rule-level trade-off: Storage rules keep it institution-scoped in v1 for simplicity
and low rule-evaluation cost).

Indexes / query patterns (RTDB needs no composite indexes here; queries are single
`orderByChild` + `limitToFirst` + `startAt(cursor)` key pagination):

- Students list: `orderByChild('displayName').limitToFirst(PAGE+1)`; can switch to push-id key
  pagination for very large institutions in v1.1 (documented trade-off).
- Attendance day: one read of `attendance/{inst}/{classId}/{date}` returns the whole class day.
- Dashboard: reads only `/institutions/{id}/stats`, `/institutions/{id}/attendanceMeta/{today}`,
  and a published-tests query — **never** downloads all students.
- Tests available to student: filtered query + client date-window check; rules independently
  re-verify the window with server `now`.

---

## [Authentication Design]

- **Provider:** Firebase Authentication **Email/Password**. Login page accepts email + password.
- **No plaintext passwords anywhere** — Firebase Auth handles hashing; the app never sees or
  stores passwords.
- **Account bootstrap without Cloud Functions** (no Blaze plan needed):
  1. **Institution registration:** visitor signs up via Firebase Auth
     (`createUserWithEmailAndPassword`). Rules allow their `/users/{uid}` record to be created
     **only** with `role: 'pending', status: 'pending'` (a user can never write any other value).
     They then submit `/institutionRequests/{id}`; rules allow creating a request only when
     `requesterUid === auth.uid` AND their user record has `role === 'pending'`.
  2. **Platform owner approval:** owner approves → single multi-location update sets the request
     review fields, creates `/institutions/{instId}` (status active), and promotes the
     requester's `/users/{uid}` to `{role:'institutionAdmin', status:'active', institutionId}`.
     Only `platformOwner` can perform this (rules). Rejection sets request rejected and user
     `status:'inactive'`.
  3. **Teachers & students:** institution admin creates a `pendingAccounts/{code}` entry (email,
     name, role, class). The person signs up themselves with Firebase Auth using their email,
     then redeems the code on an "Activate account" page. Rules allow creating `/users/{uid}`
     with a real role **only** when a matching unused code exists (email must match; institution
     comes from the code, not the client), and the one-way `unused → used` transition is the
     only permitted non-staff write to `/pendingAccounts`. A code is bound to one email and one
     uid, so it cannot be reused. Unapproved institutions cannot create staff/student accounts
     because code creation requires an active institution owned by the creator.
  4. **Platform owner bootstrap:** one-time documented manual step — create the Auth user in the
     Firebase Console, then run `scripts/seed-owner.mjs` (or apply the RTDB console update while
     temporarily in test mode). Script + docs provided; no credentials committed.
  5. **Password reset:** Firebase Auth `sendPasswordResetEmail` (free, built-in). Free-plan email
     quota is ≈10 reset emails/day — if exhausted, admins can issue a `pendingAccounts`-style
     reset code; documented fallback.
- **Session handling:** `onAuthStateChanged` listener in `AuthContext`; expired/unauthorized
  sessions redirect to login with a friendly message.
- **Never trusted from the browser:** role, institutionId, classId ownership, deadlines — all
  re-validated by Security Rules (server `now` for test windows).

**Known limitation, documented honestly:** automatic grading in v1 runs in the student's client
after submission (the answer key becomes readable only once a create-only, rules-validated
attempt exists with `status:'submitted'`, so the key cannot be read before submitting and
answers cannot be edited after). A malicious student could forge their own `_results` score.
Mitigations in v1: immutable attempts (create-only), teachers can view exact submitted answers
and correct results, and an optional Cloud Function (requires Blaze) can re-grade from the
immutable attempt later. This is stated in SECURITY.md, not hidden.

---

## [Security Architecture]  (Rules — default deny)

Files: `d:\medresahMG\firebase\database.rules.json`, `d:\medresahMG\firebase\storage.rules`,
deployed via Firebase CLI (`firebase deploy --only database,storage`).

Core rule helpers (expressions inlined in the JSON):

- `isSignedIn = auth != null`
- `myUser = root.child('users').child(auth.uid)`
- `myRole = myUser.child('role').val()`, `myInst = myUser.child('institutionId').val()`
- `isOwner = myRole === 'platformOwner'`
- `isStaff = myRole === 'institutionAdmin' || myRole === 'teacher'`
- Every tenant read/write requires `isSignedIn && myInst === $institutionId && <finer role check>`.

Rule matrix (enforced server-side; mirrored in React only for UX):

| Resource | Read | Write |
|---|---|---|
| /institutions/{id} | owner, staff of that inst (students: own inst profile) | owner only for status; staff may update own inst profile fields |
| /users/{uid} | self, owner, staff of same inst | create: self ONLY with role='pending',status='pending', OR redeem valid code with correct role; role/status/institutionId/classId changes: owner (any), instAdmin (own inst, teacher/student roles only); never self-elevating |
| /institutionRequests/{id} | creator, owner | create: pending user, requesterUid===auth.uid; review fields: owner only; status transitions pending→approved/rejected |
| /pendingAccounts/{code} | own inst staff | create/update/delete: own inst staff; by code-holder: ONLY status unused→used with email match |
| /{inst}/** tenant data | admin: all own inst; teacher: own assigned classes (attendance/tests/materials); student: own class filtered data, own attendance, own attempts/results | admin all (own inst); teacher: attendance + tests + materials for own classes; student: own attempt create-only, own result create-only after submit; NO student writes to attendance |
| /tests/{id}/_answers | own inst staff; student iff own attempt.status==='submitted' | own inst staff |
| /tests/{id}/_questions | own inst staff; student iff test published && within [start, end+grace] && enrolled | own inst staff |
| Storage materials/{inst}/** | own inst users | staff of own inst only; MIME allow-list + max size validated in rules ($resource.size < limit) |

Additional validation inside rules: date strings match `^\d{4}-\d{2}-\d{2}$`;
`now <= endTime + 30000` on attempt create; deny-by-default (no root `.read`/`.write`); no
client-settable admin flags or roles.

Automated rules tests (Emulator + `@firebase/rules-unit-testing`) cover: tenant isolation
(inst A admin cannot read/write inst B), role-escalation attempts, attendance duplicate
prevention and student-write denial, answer-key pre-submission denial, attempt re-submission
denial, material upload type/size rejection.

---

## [Files]

All paths absolute under `d:\medresahMG`.

**Project root / config**

- `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts` (React + Tailwind v4
  plugin + path alias `@/` → `src/`), `index.html`, `eslint.config.js`
- `.gitignore` (includes `.env`, `.env.*.local`, `firebase-debug.log`, `service-account*.json`)
- `.env.example` — `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (all **public** client config,
  documented as such)
- `vercel.json` (SPA rewrites → `index.html`)
- `firebase/.firebaserc` (placeholder project id), `firebase/firebase.json` (database + storage
  rules + emulator config), `firebase/database.rules.json`, `firebase/storage.rules`
- `README.md` — quickstart; `docs/DEPLOYMENT.md` — Firebase + Vercel setup, rules deployment,
  env vars, production-readiness checklist; `docs/SECURITY.md` — threat model + known trade-offs;
  `docs/DATABASE.md` — schema rationale
- `scripts/seed-owner.mjs` — documented platform-owner bootstrap

**Source — `src/`**

- `src/main.tsx`, `src/App.tsx` (router + lazy-loaded route tree + ErrorBoundary)
- `src/firebase/config.ts` (reads env, throws clear error if missing), `src/firebase/init.ts`
  (initializeApp, auth, database, storage singletons)
- `src/types/index.ts` — as specified in [Types]
- `src/strings.ts` — English UI strings dictionary (i18n-ready structure)
- `src/services/` — Firebase access layer, **zero UI imports**:
  `authService.ts`, `userService.ts`, `institutionService.ts`, `studentService.ts`,
  `teacherService.ts`, `classService.ts`, `subjectService.ts`, `attendanceService.ts`,
  `testService.ts`, `materialService.ts`, `statsService.ts`, `pendingAccountService.ts`
- `src/contexts/AuthContext.tsx` — user record + role + institution; guards
- `src/components/layout/` — `AppShell.tsx` (sidebar desktop / bottom-nav mobile),
  `AdminSidebar.tsx`, `StudentBottomNav.tsx`, `TopBar.tsx`
- `src/components/common/` — `Button.tsx`, `Card.tsx`, `StatCard.tsx`, `DataTable.tsx`,
  `Modal.tsx`, `ConfirmDialog.tsx`, `FormInput.tsx`, `Select.tsx`, `LoadingSpinner.tsx`,
  `EmptyState.tsx`, `ErrorBoundary.tsx`, `Pagination.tsx`, `Toast.tsx` (context-based),
  `FileDropzone.tsx` (resumable upload with progress)
- `src/pages/auth/` — `LoginPage.tsx`, `SignupPage.tsx`, `ActivatePage.tsx`,
  `RegisterInstitutionPage.tsx`, `ForgotPasswordPage.tsx`
- `src/pages/owner/` — `OwnerDashboardPage.tsx`, `InstitutionRequestsPage.tsx`,
  `InstitutionsPage.tsx` (suspend/reactivate)
- `src/pages/admin/` — `DashboardPage.tsx`, `StudentsPage.tsx`, `TeachersPage.tsx`,
  `ClassesPage.tsx`, `SubjectsPage.tsx`, `AttendancePage.tsx` (mark + history),
  `TestsPage.tsx`, `TestCreatePage.tsx`, `TestResultsPage.tsx`, `MaterialsPage.tsx`,
  `ReportsPage.tsx`, `SettingsPage.tsx`
- `src/pages/student/` — `StudentHomePage.tsx`, `MyAttendancePage.tsx`, `MyTestsPage.tsx`,
  `TakeTestPage.tsx`, `MyResultsPage.tsx`, `StudentMaterialsPage.tsx`, `MyAccountPage.tsx`
- `src/pages/NotFoundPage.tsx`
- `src/hooks/` — `usePagedQuery.ts`, `useDebounce.ts`, `useDocumentTitle.ts`
- `src/utils/` — `dates.ts` (YYYY-MM-DD helpers, timezone note), `validation.ts`,
  `format.ts` (file size, score), `grading.ts` (pure objective-grading function — unit tested)
- `src/styles/index.css` — Tailwind v4 `@import "tailwindcss";` + `@theme` tokens
  (madrasah-appropriate green/neutral palette, accessible contrast)
- `src/routes/index.tsx` — lazy imports, role guards (`RequireRole` wrapper)

**Tests — `tests/`**

- `tests/unit/grading.test.ts`, `tests/unit/dates.test.ts`, `tests/unit/validation.test.ts`
- `tests/rules/database.rules.test.ts` (tenant isolation, roles, attendance, tests, attempts)
- `tests/rules/storage.rules.test.ts` (upload type/size/tenant)
- `tests/setup.ts`, emulator config in `firebase.json`

**Deletions:** none (greenfield).

---

## [Functions]

Service-layer functions (all in `src/services/`, Firebase Web SDK v12 modular API; every query
paginated or scoped; every listener unsubscribed by the caller):

- `authService.ts`: `signUp(email, password)`, `signIn(email, password)`, `signOut()`,
  `sendPasswordReset(email)`, `watchAuth(cb)`
- `userService.ts`: `createPendingUser(uid, email)` (role:'pending' only),
  `redeemCodeAndActivate(uid, code)`, `getMyUser(uid)`, `setUserRole(...)`,
  `listUsersPaged(instId, role, cursor, limit)`
- `institutionService.ts`: `submitInstitutionRequest(...)` (as pending user),
  `approveInstitutionRequest(requestId, instId)` (owner, multi-location update),
  `rejectInstitutionRequest(requestId, note)`, `setInstitutionStatus(instId, status)`,
  `listInstitutionRequests(status, cursor)`
- `studentService.ts`: `createStudentViaCode(instId, {email, displayName, classId, admissionNo})`,
  `listStudentsPaged(instId, classId|null, cursor)`, `setStudentStatus`, `deleteStudent`
  (multi-location update of student + user record; counters via transaction)
- `teacherService.ts`: analogous to studentService
- `classService.ts` / `subjectService.ts`: CRUD + `assignClassTeacher`; `studentCount`
  maintained with `runTransaction`
- `attendanceService.ts`: `getDayAttendance(instId, classId, date)`,
  `saveDayAttendance(...)` (single multi-location write of entries + `_meta` counts; rules
  block arbitrary overwrites by unauthorized roles; `correctAttendance(...)` allowed for
  admin/teacher-of-class with audit fields), `listMonthAttendance(instId, classId, cursor)`
- `testService.ts`: `createTest(instId, test, questions[])` (questions split: `_questions`
  without answers, `_answers` staff-only), `publishTest`, `closeTest`,
  `listTestsPaged(instId, filters)`, `getAvailableTestsForStudent(user)`,
  `startAttempt` (optional draft autosave),
  `submitAttempt(testId, uid, answers, startedAt)` (create-only; client checks deadline for UX,
  rules enforce the real deadline), `gradeAttempt` (pure fn from `utils/grading.ts` +
  `_answers` read post-submit + `_results` create-only write),
  `getMyResults(uid)`, `getTestResults(testId)`
- `materialService.ts`: `uploadMaterial(instId, file, meta, onProgress)` —
  `uploadBytesResumable` (handles interruption/retry), validates size (configurable
  `MAX_UPLOAD_BYTES`, default 25 MB) and MIME allow-list (pdf, images, docx, mp3, m4a, txt),
  writes RTDB metadata + stats counter; `listMaterialsPaged(instId, classId|null, cursor)`,
  `getMaterialDownloadUrl(storagePath)` (tokenized expiring URL; no permanent public links),
  `deleteMaterial(...)`
- `statsService.ts`: `getDashboardStats(instId, todayIso)` — reads only `stats` +
  `attendanceMeta/{today}` + published-tests query; `recountStats(instId)` (admin utility)
- `pendingAccountService.ts`: `createCode`, `listCodes`, `deleteCode`
- `utils/grading.ts`: `gradeObjective(questionsWithAnswers, answers): {score, total}` — pure,
  unit-tested

Component notes: `TakeTestPage` fetches server time once and computes an offset so the countdown
is UX-only; submission is blocked client-side near the deadline but the rules are the real gate.
`FileDropzone` shows per-file progress and retry.

---

## [Classes]

No class-based components — function components + hooks throughout (React convention for
greenfield Vite apps). Key composite constructs:

- `AuthContext` (React context): holds `{user, userRecord, loading, isOwner, isStaff, isAdmin,
  isStudent}`; route protection via `src/routes/index.tsx` wrapper
  `<RequireRole roles={['institutionAdmin']}>`.
- `ToastContext`: success/error messages; success toasts fire only after the awaited Firebase
  promise resolves.
- Reusable presentational components listed under [Files] (Card, DataTable with responsive
  card-view fallback on mobile, Pagination, ConfirmDialog, EmptyState, LoadingSpinner).

---

## [Dependencies]

Runtime (deliberately minimal — no UI component libraries, no animation libraries):

- `react`, `react-dom` ^19
- `react-router-dom` ^7
- `firebase` ^12 (Auth, Database, Storage only — no Firestore, no Analytics)
- `tailwindcss` ^4 + `@tailwindcss/vite` ^4

Dev:

- `vite` ^7, `@vitejs/plugin-react`, `typescript` ~5.9
- `eslint` ^9 + `typescript-eslint` + `eslint-plugin-react-hooks`
- `vitest` ^3, `@firebase/rules-unit-testing` ^4, `firebase-tools` ^14 (emulator; documented),
  `jsdom` (if component tests are added)
- `@types/react`, `@types/react-dom`

Exact versions resolved at install time to latest stable majors verified compatible
(`npm install` will confirm; peer-dep conflicts reported honestly). No state-management
library (context + services suffice); no axios; no date library (hand-rolled `dates.ts`).

---

## [Testing]

- **Unit (Vitest):** `gradeObjective` (mcq/truefalse, partial/empty answers), date helpers
  (ISO day math, deadline window), form validation helpers.
- **Security rules (Vitest + RTDB/Storage emulators, `@firebase/rules-unit-testing`):**
  1. Unauthenticated read/write denied everywhere.
  2. Tenant isolation: admin A cannot read/write any `/b1/**` node; cannot approve requests.
  3. Role escalation: pending user cannot self-set role; teacher cannot self-promote; student
     cannot write attendance or other students' records.
  4. Activation: code redemption works once, wrong email denied, reuse denied, staff-only code
     creation.
  5. Attendance: same-day overwrite rules behave per role; students denied; date format
     validated.
  6. Tests: student cannot read `_answers` before submit or `_questions` outside window;
     attempt create-only; late submit denied (server `now`); result create-only.
  7. Storage: wrong-tenant deny, disallowed MIME/oversize deny, student upload deny.
- **App-level (manual test script per phase in README):** login/logout, activation, approval
  flow, attendance marking on a 360px viewport, test taking, material upload/download,
  pagination, empty/loading/error states, mobile navigation.
- **Gates before any phase is "done":** `npm run lint` clean, `npm run typecheck` clean,
  `npm run test` green (unit + rules against emulator), `npm run build` succeeds. Failures
  reported honestly; no phase declared complete otherwise.
- Real-Firebase live checks are impossible until the stakeholder provisions a project —
  documented in README ("Firebase setup required") with exact console steps; the emulator is
  used for everything automatable meanwhile.

---

## [Firebase Costs & Limits] (expected, Spark/Free plan viable for v1)

- **Auth (Email/Password):** free; free-plan limit ≈10 password-reset emails/day — reset-code
  fallback documented.
- **Realtime Database (Spark):** ~1 GB stored, ~10 GB/month download — ample for several
  madrasahs given pagination and small meta nodes; upgrade to Blaze if exceeded.
- **Storage (Spark):** ~5 GB stored, ~1 GB/day download — file-size cap (25 MB default,
  configurable) keeps this predictable.
- **Vercel:** frontend on the free tier.
- **Cloud Functions:** $0 in v1 (not used). Optional grading hardening later needs Blaze
  (pay-as-you-go, pennies at this scale, requires a billing card).
- **No paid SMS** anywhere in v1 (activation codes + email).

## [Technical Risks] (addressed before coding)

1. **Client-side auto-grading trust** — mitigated as described (immutable attempts, answer key
   gated on submit, teacher correction, documented upgrade path). Stated openly in SECURITY.md.
2. **RTDB rules cannot strip fields** — solved by physically splitting `_questions` /
   `_answers` / `_attempts` nodes.
3. **Denormalized counters drift** — transactions on every write path + admin `recountStats`.
4. **Timezones:** attendance dates are institution-local `YYYY-MM-DD` strings chosen by the
   client; test windows use epoch ms validated against server `now` (no timezone math in
   rules).
5. **Owner bootstrap is manual** — scripted + documented.
6. **Firebase free-tier email/rate limits** — activation codes decouple onboarding from email
   deliverability.
7. **Low-end devices:** lazy routes, no animation libraries, paginated reads, resumable
   uploads, mobile-first CSS.

---

## [Implementation Order]

Phased exactly as required; each phase ends with lint + typecheck + tests + build + a written
status report before moving on.

1. **Phase 1 — Foundation:** scaffold Vite+React+TS+Tailwind v4, `.gitignore`, `.env.example`,
   Firebase config/init with clear missing-config errors, TypeScript types, `strings.ts`,
   AppShell (sidebar/bottom-nav), router with lazy routes + ErrorBoundary, AuthContext,
   Login/Signup/ForgotPassword pages, `firebase.json` + first deny-all rules draft, README.
   *Tests:* unit test setup, auth service tests (mocked), build passes.
2. **Phase 2 — Tenancy & platform ownership:** institution registration request page, pending
   user signup, owner dashboard + request review/approve/reject, institution
   suspend/reactivate, full `/users` + `/institutionRequests` + `/institutions` rules, owner
   bootstrap script, rules tests for approval + role escalation.
3. **Phase 3 — People & structure:** activation codes (students & teachers), Activate page,
   admin Student/Teacher/Class/Subject pages with pagination, counters, role/tenant rules
   tests, student self-view.
4. **Phase 4 — Attendance:** attendance marking UI (mobile-efficient one-tap row toggles),
   history, correction flow with audit fields, reports page (day + monthly), `_meta` counts,
   full attendance rules tests (duplicates, student denial, unauthorized class).
5. **Phase 5 — Online tests:** test builder (mcq/truefalse), publish/close, student test list,
   TakeTestPage (UX countdown, create-only submit, clear submitted confirmation), auto-grading
   with pure fn + post-submit key access, results pages (admin/teacher/student views gated by
   `showResults`), complete test rules tests (window, answers privacy, resubmission).
6. **Phase 6 — Materials:** FileDropzone with resumable upload + type/size validation,
   metadata + storage rules, student browsing/filter/search (debounced), tokenized download
   links, delete/replace by staff, storage rules tests.
7. **Phase 7 — Hardening & ship:** performance pass (listener audit, pagination everywhere,
   memoization), full security test sweep, responsive verification at 360/768/1280px, error &
   empty-state audit, production build, `vercel.json`, DEPLOYMENT.md (Firebase + Vercel steps,
   env docs, production-readiness checklist), SECURITY.md, DATABASE.md.

Each phase reports: what was implemented, files created/modified, test results (including
failures), and the next step — per the project rules.

---

## [Handoff]

Approval requested before Phase 1 scaffolding begins. This plan is the reference document for
implementation; deviations discovered during build (e.g., package peer conflicts, emulator
quirks on Windows) will be reported as they arise rather than silently absorbed.








