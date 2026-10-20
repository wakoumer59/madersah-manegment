import { defineConfig } from 'vitest/config';

// Security Rules tests run against the Firebase Emulator Suite:
//   npm run test:rules
// (see package.json — wraps this config in `firebase emulators:exec`)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 120000,
    // Rules tests share one emulator — run files serially.
    fileParallelism: false,
  },
});
