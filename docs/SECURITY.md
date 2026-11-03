# Security Architecture — Medresa LMS

This document describes the security model actually implemented and tested. It does not claim
more protection than exists; known trade-offs are stated plainly.

## 1. Trust model

| Layer | Trusts | Never trusts |
| --- | --- | --- |
| React UI | nothing — UI guards are convenience only | any client-supplied role, institutionId, or permission |
| Firebase Security Rules | the signed-in uid + the database record at `/users/{uid}` | anything the browser sends about identity beyond the auth token |
| Firebase Auth | the email/password provider and server-only Admin SDK | — |

**Default deny.** Both rule files start with `.read: false` / `allow read, write: if false`.
Every allowance below is explicit and tested.

## 2. Roles (`/users/{uid}.role`)

`platformOwner` → `institutionAdmin` → `teacher` → `student` → `pending`

- A user can **only self-create** a record with `role: 'pending', status: 'pending'`, no
  institutionId, and an email equal to their auth token's email. Role escalation from inside
  the app is impossible without the owner acting.
- Only the **platform owner** changes roles of `institutionAdmin` and above, and manages
  institution status (suspend/reactivate).
- An **institution admin** may update users of their own institution and remove teacher/student records,
  but `role`, `email`, `uid`, and `institutionId` are immutable to them — proven by rules
  tests (`tests/rules/database.rules.test.ts`).
- **No user can edit the platform owner's record.**

## 3. Tenancy

- Every tenant record lives under `/{institutionId}/…`; rules compare the path segment with
  the caller's own `/users/{uid}.institutionId`. Cross-tenant reads and writes fail.
- The **institution id is minted by the platform owner's approval flow**, not supplied by the
  requester — an admin cannot assign anyone to another institution.
- A **suspended institution** loses all staff write access (rules check institution status).

## 4. Institution onboarding flow (Phase 2)

1. Anyone signs up on the site → auth account + `pending` user record (the only self-writable state).
2. They submit `institutionRequests/{theirUid}` — the request id equals the requester uid,
   so forging a request for someone else is structurally impossible.
3. The **platform owner** approves in one atomic multi-location update:
   request marked approved + institution created (`status: active`) + requester promoted to
   `institutionAdmin`. If any part fails, nothing is written.
4. Rejection writes a note; the requester can fix and re-submit (the only permitted rewrite).

## 5. Platform owner bootstrap (one-time, per environment)

There is intentionally **no service-account script** in the repo — service-account keys must
never be committed. Bootstrap with the Firebase Console (console writes bypass rules by design):

1. Sign up on the site with the email that should become the owner.
2. Firebase Console → **Authentication** → find the user → copy the **UID**.
3. Firebase Console → **Realtime Database** → set:
   `/users/{uid}/role = "platformOwner"` and `/users/{uid}/status = "active"`.

## 6. Passwords & recovery

- Passwords are handled exclusively by Firebase Authentication (never stored in the database,
  storage, logs, or source).
- Institution admins create teacher/student accounts through authenticated Vercel API routes;
  the API verifies the Firebase ID token and derives the institution from the admin's profile.
  The server-only Firebase Admin SDK key is stored in Vercel environment variables, never in
  the browser bundle or repository.
- Newly created accounts have `mustChangePassword: true`. Database rules block their access to
  institution data until they reauthenticate with the temporary password and change it. The
  API updates the Auth password and clears this flag. Existing invitation-code activation
  remains supported for codes created before this change.
- Existing accounts can recover access through Firebase's password-reset email flow. Older,
  not-yet-activated invitation-code accounts can still complete their original activation.

## 7. Known trade-offs (honest list)

- **Test grading is client-side.** Students can read the answer key and write their own result
  after submitting an attempt. Student results are only readable after staff set `showResults`
  to true. A malicious student can falsify their score; results are not authoritative. Teachers
  should verify submitted answers. Trusted grading requires a server-side component (for
  example, a Cloud Function).
- **Storage cannot read Realtime Database role records.** Without a trusted backend to mint
  custom claims, each Storage object is scoped to its uploader UID. Other institution members
  receive the Firebase download URL from tenant-protected RTDB metadata; that URL is a bearer
  link and should be treated as shareable. Only the uploader can replace or delete the file.

## 8. Automated verification

```bash
npm run test:rules      # RTDB + Storage Security Rules against local emulators
```

Requires **Java 11+** (the Realtime Database emulator is a Java app). On a machine without
Java, install any JRE (e.g. Temurin 17) — e.g. `winget install EclipseAdoptium.Temurin.17.JRE`
— and re-run. Tests use the demo project id `demo-medresah`; no real Firebase project or
credentials are needed.

Rules are deployed to a real project only via:

```bash
npx firebase-tools deploy --only database,storage --config firebase/firebase.json --project <firebase-project-id>
```

(Review `firebase/database.rules.json` and `firebase/storage.rules` before deploying.)
