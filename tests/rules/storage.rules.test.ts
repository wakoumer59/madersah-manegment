import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-medresah',
    storage: {
      rules: readFileSync('firebase/storage.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe('material file ownership', () => {
  it('lets the uploader access their file and denies other users', async () => {
    const ownerStorage = env.authenticatedContext('teacherA').storage();
    const path = 'materials/teacherA/instA/material1/notes.txt';
    const fileRef = ref(ownerStorage, path);

    await assertSucceeds(uploadBytes(fileRef, new Blob(['notes'], { type: 'text/plain' })));
    await assertSucceeds(getDownloadURL(fileRef));

    const otherStorage = env.authenticatedContext('teacherB').storage();
    await assertFails(getDownloadURL(ref(otherStorage, path)));
    await assertFails(
      uploadBytes(
        ref(otherStorage, path),
        new Blob(['overwrite'], { type: 'text/plain' }),
      ),
    );
  });

  it('rejects unauthenticated and unsupported uploads', async () => {
    const unauthenticatedStorage = env.unauthenticatedContext().storage();
    await assertFails(
      uploadBytes(
        ref(unauthenticatedStorage, 'materials/teacherA/instA/material1/notes.txt'),
        new Blob(['notes'], { type: 'text/plain' }),
      ),
    );

    const ownerStorage = env.authenticatedContext('teacherA').storage();
    await assertFails(
      uploadBytes(
        ref(ownerStorage, 'materials/teacherA/instA/material1/script.exe'),
        new Blob(['content'], { type: 'application/x-msdownload' }),
      ),
    );
  });
});
