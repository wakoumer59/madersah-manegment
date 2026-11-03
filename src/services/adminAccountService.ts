import type { UserRole } from '@/types';

async function postAdminApi(
  path: string,
  idToken: string,
  body: Record<string, string>,
): Promise<void> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  let result: { error?: string };
  try {
    result = await response.json() as { error?: string };
  } catch {
    throw new Error('The account service returned an invalid response. Please retry.');
  }
  if (!response.ok) throw new Error(result.error ?? 'The request could not be completed.');
}

export async function createManagedAccount(input: {
  idToken: string;
  role: Extract<UserRole, 'teacher' | 'student'>;
  displayName: string;
  email: string;
  temporaryPassword: string;
  classId?: string;
  admissionNo?: string;
}): Promise<void> {
  const body: Record<string, string> = {
    role: input.role,
    displayName: input.displayName,
    email: input.email,
    temporaryPassword: input.temporaryPassword,
  };
  if (input.classId) body.classId = input.classId;
  if (input.admissionNo) body.admissionNo = input.admissionNo;
  await postAdminApi('/api/admin/accounts', input.idToken, body);
}

export async function setNewPassword(input: {
  idToken: string;
  newPassword: string;
}): Promise<void> {
  await postAdminApi('/api/account/change-password', input.idToken, {
    newPassword: input.newPassword,
  });
}

export async function deleteManagedAccount(input: {
  idToken: string;
  uid: string;
  role: Extract<UserRole, 'teacher' | 'student'>;
}): Promise<void> {
  await postAdminApi('/api/admin/delete-account', input.idToken, {
    uid: input.uid,
    role: input.role,
  });
}
