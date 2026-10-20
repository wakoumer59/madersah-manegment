# Deployment Guide — Medresa LMS

This guide covers deploying Medresa LMS to production using **Firebase** (backend) and
**Vercel** (frontend hosting). No Cloud Functions are required for v1.

## Prerequisites

- A Firebase project (Spark/Blaze plan — Spark is free and sufficient for v1 limits)
- A Vercel account
- Node.js 18+ and `npm` (or `yarn`/`pnpm`)
- Java 11+ (only needed to run Security Rules tests locally against the emulator)

## Step 1 — Prepare the repository

```bash
# Install dependencies
npm install

# Copy env example and fill in your Firebase public client config
cp .env.example .env
# Edit .env with values from Firebase Console → Project settings → Your apps → Web app
```

> The `.env` values are **public client configuration** — safe to expose in the browser.
> All access control is enforced by Firebase Security Rules + Authentication, never by
> hiding config.

## Step 2 — Configure Firebase

### Configure Firebase project ID

The Firebase project ID `madresahmg` is already configured in `firebase/.firebaserc`:

```json
{
  "projects": {
    "default": "madresahmg"
  }
}
```

If you're using a different Firebase project, update `firebase/.firebaserc` and `VITE_FIREBASE_PROJECT_ID` in `.env` accordingly.

1. **Authentication** → Enable **Email/Password** provider
2. **Realtime Database** → Create a database (start in locked mode, then deploy rules)
3. **Storage** → Create a bucket (start with default rules, then deploy storage rules)

### Deploy Security Rules

```bash
# Deploy database + storage rules to your Firebase project
firebase deploy --only database,storage
```

Review `firebase/database.rules.json` and `firebase/storage.rules` before deploying.

### Bootstrap the platform owner (one-time)

There is intentionally no service-account script in the repo — service-account keys must
never be committed. Bootstrap manually via the Firebase Console:

1. Sign up on the deployed site with the email that should become the owner.
2. Firebase Console → **Authentication** → find the user → copy the **UID**.
3. Firebase Console → **Realtime Database** → set:
   - `/users/{uid}/role = "platformOwner"`
   - `/users/{uid}/status = "active"`

## Step 3 — Deploy the frontend to Vercel

### Connect the repository

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New Project** → import the repository.
3. Framework preset: **Vite** (detected automatically).
4. Build command: `npm run build`
5. Output directory: `dist`
6. Install command: `npm install`

### Add environment variables

In Vercel project **Settings → Environment Variables**, add all `VITE_FIREBASE_*`
variables from your `.env` file:

| Variable | Source |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project settings → Your apps → Web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | same |
| `VITE_FIREBASE_DATABASE_URL` | same |
| `VITE_FIREBASE_PROJECT_ID` | same |
| `VITE_FIREBASE_STORAGE_BUCKET` | same |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | same |
| `VITE_FIREBASE_APP_ID` | same |

Redeploy after adding variables.

## Step 4 — Verify the deployment

1. Open the Vercel deployment URL.
2. Confirm the app loads without a "Configuration required" error.
3. Sign up with an account, then bootstrap yourself as platform owner (Step 2).
4. Register an institution, approve it, create classes/subjects/students/teachers.
5. Test attendance, online tests, and materials end-to-end.

## Production-readiness checklist

- [ ] Firebase Auth: Email/Password provider enabled
- [ ] Realtime Database: rules deployed from `firebase/database.rules.json`
- [ ] Storage: rules deployed from `firebase/storage.rules`
- [ ] `.env` (local) and Vercel env vars: all 7 `VITE_FIREBASE_*` values set
- [ ] Platform owner bootstrapped via Firebase Console
- [ ] Production build passes (`npm run build`)
- [ ] Unit tests pass (`npm run test`)
- [ ] Security rules tests pass (`npm run test:rules`, requires Java 11+)

## Local development

```bash
npm run dev          # start Vite dev server
npm run build        # production typecheck + bundle
npm run test         # unit tests (vitest)
npm run test:rules   # RTDB rules tests vs emulator (Java 11+)
npm run lint         # ESLint
```

## Firebase free-tier limits (v1)

- Realtime Database: 100 concurrent connections, 1 GB storage — adequate for small
  madrasahs; monitor usage in the Firebase Console.
- Authentication: 50,000 monthly active users free.
- Storage: 5 GB free.

## Support

If a page shows "Configuration required", your `.env` / Vercel env vars are missing or
incomplete. If you see permission errors, check that Firebase Security Rules are deployed
and that your user record has the correct role/institution.