// Material service — metadata in RTDB, file in Firebase Storage.
//
//   /{institutionId}/materials/{materialId}     metadata (RTDB)
//   materials/{institutionId}/{materialId}       file blob (Storage)
//
// Metadata is written only after a successful storage upload; deletes remove
// both the storage object and the RTDB record.
import {
  child, get, limitToFirst, orderByChild, push, query, ref,
  remove, serverTimestamp, set, startAfter, update,
} from 'firebase/database';
import {
  deleteObject, getDownloadURL, ref as storageRef,
  uploadBytesResumable,
} from 'firebase/storage';
import { getDb, getFirebaseStorage } from '@/firebase/init';
import type { Material } from '@/types';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
// 10 MB
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function toMaterial(id: string, value: Record<string, unknown>): Material {
  return {
    id,
    title: String(value.title ?? ''),
    description: String(value.description ?? ''),
    classId: (value.classId as string | null) ?? null,
    subjectId: (value.subjectId as string | null) ?? null,
    visibility: (value.visibility as 'class' | 'institution') ?? 'institution',
    fileName: String(value.fileName ?? ''),
    contentType: String(value.contentType ?? ''),
    size: Number(value.size ?? 0),
    storagePath: String(value.storagePath ?? ''),
    downloadUrl: String(value.downloadUrl ?? ''),
    uploadedBy: String(value.uploadedBy ?? ''),
    createdAt: Number(value.createdAt ?? 0),
    downloadCount: Number(value.downloadCount ?? 0),
  };
}
/** Validate a File before upload. Returns null when valid, else an error message. */
export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Unsupported file type. Allowed: PDF, images (PNG/JPG/GIF/WebP), TXT, DOC/DOCX.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

export async function createMaterial(input: {
  institutionId: string; title: string; description: string;
  classId: string | null; subjectId: string | null; visibility: 'class' | 'institution';
  file: File; uploadedBy: string;
}): Promise<Material> {
  const err = validateFile(input.file);
  if (err) throw new Error(err);

  const id = push(child(ref(getDb()), `${input.institutionId}/materials`)).key;
  if (!id) throw new Error('Could not generate a material id.');
  const storagePath = `materials/${input.institutionId}/${id}/${input.file.name}`;
  const storage = getFirebaseStorage();
  const fileRef = storageRef(storage, storagePath);

  // Upload to storage first
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, input.file);
    task.on(
      'state_changed',
      undefined,
      (err) => reject(err),
      () => resolve(),
    );
  });

  const downloadUrl = await getDownloadURL(fileRef);

  await set(ref(getDb(), `${input.institutionId}/materials/${id}`), {
    id, title: input.title.trim(), description: input.description.trim(),
    classId: input.classId, subjectId: input.subjectId,
    visibility: input.visibility,
    fileName: input.file.name, contentType: input.file.type,
    size: input.file.size, storagePath, downloadUrl,
    uploadedBy: input.uploadedBy, createdAt: serverTimestamp(),
    downloadCount: 0,
  });

  return {
    id, title: input.title.trim(), description: input.description.trim(),
    classId: input.classId, subjectId: input.subjectId,
    visibility: input.visibility,
    fileName: input.file.name, contentType: input.file.type,
    size: input.file.size, storagePath, downloadUrl,
    uploadedBy: input.uploadedBy, createdAt: Date.now(),
    downloadCount: 0,
  };
}
export async function listMaterialsPaged(
  institutionId: string,
  cursor: string | null = null,
  pageSize = 20,
): Promise<{ items: Material[]; nextCursor: string | null }> {
  const base = query(
    ref(getDb(), `${institutionId}/materials`),
    orderByChild('createdAt'), limitToFirst(pageSize + 1),
  );
  const snapshot = await get(cursor ? query(base, startAfter(cursor)) : base);
  if (!snapshot.exists()) return { items: [], nextCursor: null };
  const items: Material[] = [];
  snapshot.forEach((childSnap) => {
    items.push(toMaterial(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  const hasMore = items.length > pageSize;
  return {
    items: hasMore ? items.slice(0, pageSize) : items,
    nextCursor: hasMore ? String(items[pageSize - 1]?.createdAt ?? null) : null,
  };
}

export async function getMaterial(
  institutionId: string, materialId: string,
): Promise<Material | null> {
  const snapshot = await get(ref(getDb(), `${institutionId}/materials/${materialId}`));
  if (!snapshot.exists()) return null;
  return toMaterial(materialId, snapshot.val() as Record<string, unknown>);
}

export async function incrementDownloadCount(
  institutionId: string, materialId: string,
): Promise<void> {
  await update(ref(getDb(), `${institutionId}/materials/${materialId}/downloadCount`), serverTimestamp());
}

export async function deleteMaterial(
  institutionId: string, materialId: string,
): Promise<void> {
  const material = await getMaterial(institutionId, materialId);
  if (material) {
    const storage = getFirebaseStorage();
    const fileRef = storageRef(storage, material.storagePath);
    await deleteObject(fileRef).catch(() => { /* best effort */ });
  }
  await remove(ref(getDb(), `${institutionId}/materials/${materialId}`));
}

export async function replaceMaterial(
  institutionId: string, materialId: string, file: File, uploadedBy: string,
): Promise<Material> {
  const err = validateFile(file);
  if (err) throw new Error(err);

  const material = await getMaterial(institutionId, materialId);
  if (!material) throw new Error('Material not found.');

  const storage = getFirebaseStorage();
  const storagePath = `materials/${institutionId}/${materialId}/${file.name}`;
  const fileRef = storageRef(storage, storagePath);

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file);
    task.on('state_changed', undefined, (err) => reject(err), () => resolve());
  });

  const downloadUrl = await getDownloadURL(fileRef);

  // Delete old file
  if (material.storagePath) {
    const oldRef = storageRef(storage, material.storagePath);
    await deleteObject(oldRef).catch(() => { /* best effort */ });
  }

  await update(ref(getDb(), `${institutionId}/materials/${materialId}`), {
    title: material.title, description: material.description,
    classId: material.classId, subjectId: material.subjectId,
    visibility: material.visibility,
    fileName: file.name, contentType: file.type, size: file.size,
    storagePath, downloadUrl, uploadedBy, createdAt: material.createdAt,
    downloadCount: material.downloadCount,
  });

  return {
    ...material,
    fileName: file.name, contentType: file.type, size: file.size,
    storagePath, downloadUrl, uploadedBy,
  };
}