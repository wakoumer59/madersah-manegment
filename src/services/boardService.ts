import {
  child,
  get,
  limitToLast,
  orderByChild,
  push,
  query,
  ref,
  remove,
  set,
} from 'firebase/database';
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
} from 'firebase/storage';
import { getDb, getFirebaseStorage } from '@/firebase/init';
import type { BoardPost } from '@/types';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 90;

function toBoardPost(id: string, value: Record<string, unknown>): BoardPost {
  const mediaType = value.mediaType === 'image' || value.mediaType === 'video'
    ? value.mediaType
    : null;
  return {
    id,
    title: String(value.title ?? ''),
    body: String(value.body ?? ''),
    authorUid: String(value.authorUid ?? ''),
    authorName: String(value.authorName ?? ''),
    createdAt: Number(value.createdAt ?? 0),
    mediaUrl: typeof value.mediaUrl === 'string' ? value.mediaUrl : null,
    mediaPath: typeof value.mediaPath === 'string' ? value.mediaPath : null,
    mediaType,
    mediaName: typeof value.mediaName === 'string' ? value.mediaName : null,
  };
}

export function validateBoardMedia(file: File): string | null {
  if (IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_SIZE) return null;
  if (VIDEO_TYPES.includes(file.type) && file.size <= MAX_VIDEO_SIZE) return null;
  if (IMAGE_TYPES.includes(file.type)) return 'Images must be 10 MB or smaller.';
  if (VIDEO_TYPES.includes(file.type)) return 'Videos must be 25 MB or smaller.';
  return 'Choose a JPG, PNG, or WebP image, or an MP4 or WebM video.';
}

export function validateBoardText(title: string, body: string, hasMedia = false): string | null {
  if (!title.trim()) return 'Post title is required.';
  if (title.trim().length > 120) return 'Post title must be 120 characters or fewer.';
  if (body.length > 5000) return 'Post text must be 5,000 characters or fewer.';
  if (!body.trim() && !hasMedia) return 'Write a message or attach an image or video.';
  return null;
}

function getMediaType(file: File): 'image' | 'video' {
  return file.type.startsWith('image/') ? 'image' : 'video';
}

function getMediaExtension(file: File): string {
  return file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
}

async function uploadBoardMedia(
  file: File,
  path: string,
  onProgress?: (progress: number) => void,
  onUploaded?: () => void,
): Promise<string> {
  const fileRef = storageRef(getFirebaseStorage(), path);
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type });
    task.on(
      'state_changed',
      (snapshot) => {
        onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      reject,
      () => {
        onUploaded?.();
        resolve();
      },
    );
  });
  return getDownloadURL(fileRef);
}

export async function listBoardPosts(institutionId: string): Promise<BoardPost[]> {
  const postsQuery = query(
    ref(getDb(), `${institutionId}/boardPosts`),
    orderByChild('createdAt'),
    limitToLast(50),
  );
  const snapshot = await get(postsQuery);
  if (!snapshot.exists()) return [];
  const posts: BoardPost[] = [];
  snapshot.forEach((postSnapshot) => {
    posts.push(toBoardPost(postSnapshot.key, postSnapshot.val() as Record<string, unknown>));
  });
  return posts.reverse();
}

export async function createBoardPost(input: {
  institutionId: string;
  authorUid: string;
  authorName: string;
  title: string;
  body: string;
  media?: File | null;
  onProgress?: (progress: number) => void;
}): Promise<void> {
  const textError = validateBoardText(input.title, input.body, !!input.media);
  if (textError) throw new Error(textError);
  if (input.media) {
    const mediaError = validateBoardMedia(input.media);
    if (mediaError) throw new Error(mediaError);
  }

  const postId = push(child(ref(getDb()), `${input.institutionId}/boardPosts`)).key;
  if (!postId) throw new Error('Could not generate a post id.');

  let mediaPath: string | null = null;
  let mediaUploaded = false;
  try {
    let mediaUrl: string | null = null;
    let mediaType: BoardPost['mediaType'] = null;
    if (input.media) {
      mediaPath =
        `boardMedia/${input.authorUid}/${input.institutionId}/${postId}.${getMediaExtension(input.media)}`;
      mediaUrl = await uploadBoardMedia(
        input.media,
        mediaPath,
        input.onProgress,
        () => {
          mediaUploaded = true;
        },
      );
      mediaType = getMediaType(input.media);
    }

    await set(ref(getDb(), `${input.institutionId}/boardPosts/${postId}`), {
      id: postId,
      title: input.title.trim(),
      body: input.body.trim(),
      authorUid: input.authorUid,
      authorName: input.authorName.trim(),
      createdAt: Date.now(),
      mediaUrl,
      mediaPath,
      mediaType,
      mediaName: input.media?.name ?? null,
    });
  } catch (error) {
    if (mediaPath && mediaUploaded) {
      try {
        await deleteObject(storageRef(getFirebaseStorage(), mediaPath));
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Could not publish the post or clean up its uploaded media.',
        );
      }
    }
    throw error;
  }
}

export async function deleteBoardPost(
  institutionId: string,
  post: BoardPost,
): Promise<void> {
  if (post.mediaPath) {
    await deleteObject(storageRef(getFirebaseStorage(), post.mediaPath));
  }
  await remove(ref(getDb(), `${institutionId}/boardPosts/${post.id}`));
}

export function validateShortVideo(file: File): Promise<string | null> {
  if (!VIDEO_TYPES.includes(file.type)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve('Could not read the video. Try another file.');
    }, 10_000);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      const duration = video.duration;
      cleanup();
      resolve(
        Number.isFinite(duration) && duration > 0 && duration <= MAX_VIDEO_DURATION_SECONDS
          ? null
          : 'Videos must be 90 seconds or shorter.',
      );
    };
    video.onerror = () => {
      window.clearTimeout(timeout);
      cleanup();
      resolve('Could not read the video. Try another file.');
    };
    video.src = objectUrl;
  });
}
