import {
  child,
  get,
  orderByChild,
  push,
  query,
  ref,
  remove,
  set,
} from 'firebase/database';
import { getDb } from '@/firebase/init';
import type { QaidaLesson } from '@/types';

const LESSONS_PATH = 'qaidaLessons';
const MAX_TITLE_LENGTH = 100;
const MAX_TEXT_LENGTH = 20_000;

export interface QaidaWordRange {
  text: string;
  start: number;
  end: number;
}

export function getQaidaWordRanges(text: string): QaidaWordRange[] {
  const words: QaidaWordRange[] = [];
  for (const match of text.matchAll(/\S+/gu)) {
    const start = match.index;
    words.push({ text: match[0], start, end: start + match[0].length });
  }
  return words;
}

export function getQaidaWordIndexAtCharacter(
  words: QaidaWordRange[],
  charIndex: number,
): number | null {
  if (!Number.isInteger(charIndex) || charIndex < 0) return null;
  const index = words.findIndex((word) => charIndex >= word.start && charIndex < word.end);
  return index < 0 ? null : index;
}

export function validateQaidaLesson(title: string, text: string): string | null {
  if (!title.trim()) return 'Lesson title is required.';
  if (title.trim().length > MAX_TITLE_LENGTH) return 'Lesson title is too long.';
  if (!text.trim()) return 'Lesson text is required.';
  if (text.trim().length > MAX_TEXT_LENGTH) return 'Lesson text is too long.';
  return null;
}

function toQaidaLesson(id: string, value: Record<string, unknown>): QaidaLesson {
  return {
    id,
    order: Number(value.order ?? 0),
    title: String(value.title ?? ''),
    text: String(value.text ?? ''),
    createdBy: String(value.createdBy ?? ''),
    createdAt: Number(value.createdAt ?? 0),
  };
}

export async function listQaidaLessons(institutionId: string): Promise<QaidaLesson[]> {
  const snapshot = await get(
    query(ref(getDb(), `${institutionId}/${LESSONS_PATH}`), orderByChild('order')),
  );
  if (!snapshot.exists()) return [];
  const lessons: QaidaLesson[] = [];
  snapshot.forEach((lessonSnapshot) => {
    lessons.push(
      toQaidaLesson(lessonSnapshot.key, lessonSnapshot.val() as Record<string, unknown>),
    );
  });
  return lessons;
}

export async function createQaidaLesson(input: {
  institutionId: string;
  order: number;
  title: string;
  text: string;
  createdBy: string;
}): Promise<void> {
  const validationError = validateQaidaLesson(input.title, input.text);
  if (validationError) throw new Error(validationError);
  if (!Number.isInteger(input.order) || input.order < 1) {
    throw new Error('Lesson number must be a positive whole number.');
  }
  const id = push(child(ref(getDb()), `${input.institutionId}/${LESSONS_PATH}`)).key;
  if (!id) throw new Error('Could not generate a lesson id.');
  await set(ref(getDb(), `${input.institutionId}/${LESSONS_PATH}/${id}`), {
    id,
    order: input.order,
    title: input.title.trim(),
    text: input.text.trim(),
    createdBy: input.createdBy,
    createdAt: Date.now(),
  });
}

export async function deleteQaidaLesson(
  institutionId: string,
  lessonId: string,
): Promise<void> {
  await remove(ref(getDb(), `${institutionId}/${LESSONS_PATH}/${lessonId}`));
}
