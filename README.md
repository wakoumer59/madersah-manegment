# Medresa LMS

A mobile-first learning management system for multiple independent madrasahs, built with
React, TypeScript, Vite, Tailwind CSS, and Firebase Authentication, Realtime Database, and
Storage. The frontend is configured for deployment to Vercel.

## Local development

Use Node.js 22.12 or newer.

```bash
npm ci
```

Copy `.env.example` to `.env` and set the Firebase web app configuration, then run:

```bash
npm run dev
```

If Firebase configuration is missing, the app displays a configuration error rather than
using fake data.

## Firebase production setup

Before deploying the frontend:

1. Create a Firebase project and register a Web app.
2. Enable Email/Password in **Authentication**.
3. Create a Realtime Database and enable **Storage**.
4. Deploy and review this repository's database and Storage rules before using real data:

   ```bash
   npx firebase-tools deploy --config firebase/firebase.json --project <firebase-project-id> --only database,storage
   ```

5. Add the deployed `vercel.app` hostname and any custom domain to Firebase
   Authentication's **Authorized domains**.
6. Bootstrap the platform owner using the steps in
   [docs/SECURITY.md](docs/SECURITY.md#5-platform-owner-bootstrap-one-time-per-environment).

Firebase web app values are public client configuration, not server secrets. Keep service
account keys and other private credentials out of the repository.

## Vercel deployment

Import this repository into Vercel with the repository root as the project root. The
included `vercel.json` configures the production build (`npm run deploy:build`), `dist` output,
SPA route fallback, asset caching, and basic security headers.

In the Vercel project's **Settings → Environment Variables**, add the following variables
for each environment that should run the app (Production, and Preview if needed). Use the
values from **Firebase Console → Project settings → Your apps → Web app**:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
FIREBASE_DATABASE_URL
FIREBASE_SERVICE_ACCOUNT_JSON
```

These `VITE_` variables are embedded into the browser bundle at build time. The Vercel build
checks that all seven are present and stops with a clear error if any are missing. Set them
in Vercel before the first deployment, and redeploy after changing them.

The two `FIREBASE_` server variables are used only by Vercel API functions. Create a Firebase
service account with Firebase Authentication Admin and Realtime Database Admin permissions,
store its complete JSON key as `FIREBASE_SERVICE_ACCOUNT_JSON`, and set the matching database
URL as `FIREBASE_DATABASE_URL`. Never use a `VITE_` prefix for private credentials or commit
the service-account key. The build checks that these server variables are configured.

To enable Madinah Mushaf text and page divisions, create a **Backend/server** app in the
[Quran Foundation Developer Console](https://dev-console.quran.foundation/projects), request
production Content API access, then add these Vercel server environment variables:

```text
QF_CLIENT_ID
QF_CLIENT_SECRET
QF_ENV=production
```

The client secret is used only by the server-side `/api/quran` function. Never add it as a
`VITE_` variable. The pre-live environment (`QF_ENV=prelive`) is for testing and only includes
Al-Fatihah and Al-Baqarah. Until credentials are configured, the reader keeps using its existing
Quran text source and displays a notice; recitation audio and reciter selection remain unchanged.
Qaida uses lesson text supplied by your school in the same Mushaf-inspired page layout; the
Quran Foundation API does not provide Qaida Nuraniya content.

To enable AI System Help, add `OPENAI_API_KEY` as a sensitive, server-only Vercel environment
variable. Optionally set `OPENAI_MODEL` to a model available to your API account (the default
is `gpt-4o-mini`), then redeploy. The Help page is role-aware and answers from a fixed guide to
the features in this LMS. It verifies the signed-in user's Firebase account and does not read
school records or save chat history. Questions and short conversation context are sent to
OpenAI to generate answers; tell users not to include passwords or private student information.
API usage may incur charges on your OpenAI account; configure usage limits with the provider.
Never expose the API key with a `VITE_` prefix.

Institution admins can create teacher and student accounts with a temporary password. The
user must sign in with that password and choose a different one before accessing institution
data. For local API development, run the project with Vercel's development runtime so the
`/api` functions are available.

## Verification

Run these checks before a release:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:rules
```

The Firebase Realtime Database rules tests require Java to be installed and available on
`PATH`; they run against the local emulator and do not require production credentials.
