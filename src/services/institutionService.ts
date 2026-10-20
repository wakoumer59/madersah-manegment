// Institution registration & tenancy service — /institutionRequests, /institutions.
// Approval is a single atomic multi-location update: request review fields +
// institution creation + requester promotion to institutionAdmin. Only the
// platform owner can approve/reject (enforced by Security Rules).
import {
  child,
  equalTo,
  get,
  limitToFirst,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  startAfter,
  update,
} from 'firebase/database';
import { getDb } from '@/firebase/init';
import type { Institution, InstitutionRequest } from '@/types';

function toRequest(id: string, value: Record<string, unknown>): InstitutionRequest {
  return {
    id,
    institutionName: String(value.institutionName ?? ''),
    contactEmail: String(value.contactEmail ?? ''),
    phone: String(value.phone ?? ''),
    address: String(value.address ?? ''),
    requesterUid: String(value.requesterUid ?? ''),
    requesterName: String(value.requesterName ?? ''),
    status: (value.status as InstitutionRequest['status']) ?? 'pending',
    reviewNote: String(value.reviewNote ?? ''),
    reviewedBy: (value.reviewedBy as string | null) ?? null,
    createdAt: Number(value.createdAt ?? 0),
    reviewedAt: value.reviewedAt == null ? null : Number(value.reviewedAt),
  };
}

function toInstitution(id: string, value: Record<string, unknown>): Institution {
  return {
    id,
    name: String(value.name ?? ''),
    status: (value.status as Institution['status']) ?? 'pending',
    contactEmail: String(value.contactEmail ?? ''),
    phone: String(value.phone ?? ''),
    address: String(value.address ?? ''),
    createdBy: String(value.createdBy ?? ''),
    createdAt: Number(value.createdAt ?? 0),
    updatedAt: Number(value.updatedAt ?? 0),
  };
}

export interface InstitutionRequestInput {
  institutionName: string;
  contactEmail: string;
  phone: string;
  address: string;
}

/**
 * Submits (or re-submits after rejection) an institution registration request.
 * The request id IS the requester's uid — one request per user, no duplicates,
 * and the rules trivially prove ownership.
 */
export async function submitInstitutionRequest(
  input: InstitutionRequestInput,
  requester: { uid: string; displayName: string },
): Promise<void> {
  const uid = requester.uid;
  await update(ref(getDb()), {
    [`institutionRequests/${uid}`]: {
      id: uid,
      institutionName: input.institutionName.trim(),
      contactEmail: input.contactEmail.trim().toLowerCase(),
      phone: input.phone.trim(),
      address: input.address.trim(),
      requesterUid: uid,
      requesterName: requester.displayName,
      status: 'pending',
      reviewNote: '',
      reviewedBy: null,
      createdAt: serverTimestamp(),
      reviewedAt: null,
    },
  });
}

/** The signed-in user's own request (any status), or null. */
export async function getMyInstitutionRequest(
  uid: string,
): Promise<InstitutionRequest | null> {
  const snapshot = await get(ref(getDb(), `institutionRequests/${uid}`));
  if (!snapshot.exists()) return null;
  return toRequest(uid, snapshot.val() as Record<string, unknown>);
}

/** Lists requests by status (owner only — rules enforce). Newest first. */
export async function listInstitutionRequests(
  status: InstitutionRequest['status'],
): Promise<InstitutionRequest[]> {
  const snapshot = await get(
    query(ref(getDb(), 'institutionRequests'), orderByChild('status'), equalTo(status)),
  );
  if (!snapshot.exists()) return [];
  const requests: InstitutionRequest[] = [];
  snapshot.forEach((childSnap) => {
    requests.push(toRequest(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  return requests.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPendingRequestCount(): Promise<number> {
  const snapshot = await get(
    query(ref(getDb(), 'institutionRequests'), orderByChild('status'), equalTo('pending')),
  );
  return snapshot.size;
}

/**
 * Approves a request: creates the institution and promotes the requester to
 * institutionAdmin — atomically, in one update (all-or-nothing).
 * Returns the new institution id.
 */
export async function approveInstitutionRequest(
  request: InstitutionRequest,
  ownerUid: string,
): Promise<string> {
  const instId = push(child(ref(getDb()), 'institutions')).key;
  if (!instId) throw new Error('Could not generate an institution id. Please try again.');
  await update(ref(getDb()), {
    [`institutionRequests/${request.requesterUid}/status`]: 'approved',
    [`institutionRequests/${request.requesterUid}/reviewedBy`]: ownerUid,
    [`institutionRequests/${request.requesterUid}/reviewedAt`]: serverTimestamp(),
    [`institutions/${instId}`]: {
      id: instId,
      name: request.institutionName,
      contactEmail: request.contactEmail,
      phone: request.phone,
      address: request.address,
      status: 'active',
      createdBy: request.requesterUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    [`users/${request.requesterUid}/role`]: 'institutionAdmin',
    [`users/${request.requesterUid}/status`]: 'active',
    [`users/${request.requesterUid}/institutionId`]: instId,
  });
  return instId;
}

/** Rejects a request with a note; the user may fix the data and re-submit. */
export async function rejectInstitutionRequest(
  request: InstitutionRequest,
  ownerUid: string,
  note: string,
): Promise<void> {
  await update(ref(getDb()), {
    [`institutionRequests/${request.requesterUid}/status`]: 'rejected',
    [`institutionRequests/${request.requesterUid}/reviewNote`]: note.trim(),
    [`institutionRequests/${request.requesterUid}/reviewedBy`]: ownerUid,
    [`institutionRequests/${request.requesterUid}/reviewedAt`]: serverTimestamp(),
  });
}

/** Owner-only list of institutions with simple cursor pagination (page = 20). */
export async function listInstitutions(
  cursor: string | null = null,
  pageSize = 20,
): Promise<{ items: Institution[]; nextCursor: string | null }> {
  const base = query(
    ref(getDb(), 'institutions'),
    orderByChild('name'),
    limitToFirst(pageSize + 1),
  );
  const snapshot = await get(cursor ? query(base, startAfter(cursor)) : base);
  if (!snapshot.exists()) return { items: [], nextCursor: null };
  const items: Institution[] = [];
  snapshot.forEach((childSnap) => {
    items.push(toInstitution(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  const hasMore = items.length > pageSize;
  return {
    items: hasMore ? items.slice(0, pageSize) : items,
    nextCursor: hasMore ? (items[pageSize - 1]?.name ?? null) : null,
  };
}

/** Owner-only: suspend or reactivate an institution. */
export async function setInstitutionStatus(
  instId: string,
  status: 'active' | 'suspended',
): Promise<void> {
  await update(ref(getDb(), `institutions/${instId}`), {
    status,
    updatedAt: serverTimestamp(),
  });
}

