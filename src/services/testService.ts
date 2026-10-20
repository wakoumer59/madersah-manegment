// Test service — /{institutionId}/tests/{testId}/
//
// Data layout:
//   tests/$institutionId/$testId/          test metadata
//   _questions/$questionId/                staff only — includes correct answer
//   _studentQuestions/$questionId/         student readable — NO correct answer
//   _attempts/$studentUid/                 student writes own; staff reads all
//   _results/$studentUid/                  staff writes; student reads if showResults
import {
  child, get, limitToFirst, orderByChild, push, query, ref,
  remove, serverTimestamp, set, startAfter, update,
} from 'firebase/database';
import { getDb } from '@/firebase/init';
import type {
  AnswerChoice,
  Question,
  QuestionType,
  Test,
  TestAttempt,
  TestResult,
  TestStatus,
} from '@/types';

function toTest(id: string, value: Record<string, unknown>): Test {
  return {
    id,
    title: String(value.title ?? ''),
    description: String(value.description ?? ''),
    classId: String(value.classId ?? ''),
    subjectId: (value.subjectId as string | null) ?? null,
    startTime: Number(value.startTime ?? 0),
    endTime: Number(value.endTime ?? 0),
    durationMin: Number(value.durationMin ?? 0),
    maxScore: Number(value.maxScore ?? 0),
    status: (value.status as TestStatus) ?? 'draft',
    showResults: Boolean(value.showResults ?? false),
    questionCount: Number(value.questionCount ?? 0),
    createdBy: String(value.createdBy ?? ''),
    createdAt: Number(value.createdAt ?? 0),
  };
}

function toQuestion(_id: string, value: Record<string, unknown>): Question {
  return {
    id: _id,
    type: (value.type as QuestionType) ?? 'mcq',
    text: String(value.text ?? ''),
    options: (value.options as Record<string, string>) ?? {},
  };
}

function toQuestionWithAnswer(
  id: string,
  value: Record<string, unknown>,
): Question & { correct: AnswerChoice } {
  return {
    ...toQuestion(id, value),
    correct: (value.correct as AnswerChoice) ?? 'A',
  };
}

function toAttempt(_id: string, value: Record<string, unknown>): TestAttempt {
  return {
    testId: String(value.testId ?? ''),
    studentUid: String(value.studentUid ?? ''),
    answers: (value.answers as Record<string, AnswerChoice>) ?? {},
    startedAt: Number(value.startedAt ?? 0),
    submittedAt: Number(value.submittedAt ?? 0),
    status: (value.status as 'in_progress' | 'submitted') ?? 'in_progress',
  };
}

function toResult(_id: string, value: Record<string, unknown>): TestResult {
  return {
    score: Number(value.score ?? 0),
    total: Number(value.total ?? 0),
    gradedAt: Number(value.gradedAt ?? 0),
    method: (value.method as 'client' | 'server') ?? 'client',
  };
}
// Test metadata
export async function createTest(input: {
  institutionId: string; title: string; description: string; classId: string;
  subjectId: string | null; startTime: number; endTime: number; durationMin: number;
  maxScore: number; createdBy: string;
}): Promise<string> {
  const id = push(child(ref(getDb()), `${input.institutionId}/tests`)).key;
  if (!id) throw new Error('Could not generate a test id.');
  await set(ref(getDb(), `${input.institutionId}/tests/${id}`), {
    id, title: input.title.trim(), description: input.description.trim(),
    classId: input.classId, subjectId: input.subjectId,
    startTime: input.startTime, endTime: input.endTime,
    durationMin: input.durationMin, maxScore: input.maxScore,
    status: 'draft', showResults: false, questionCount: 0,
    createdBy: input.createdBy, createdAt: serverTimestamp(),
  });
  return id;
}

export async function updateTest(input: {
  institutionId: string; testId: string;
  patch: Partial<Pick<Test, 'title' | 'description' | 'classId' | 'subjectId' |
    'startTime' | 'endTime' | 'durationMin' | 'maxScore' | 'status' | 'showResults'>>;
}): Promise<void> {
  await update(ref(getDb(), `${input.institutionId}/tests/${input.testId}`), {
    ...input.patch,
  });
}

export async function deleteTest(institutionId: string, testId: string): Promise<void> {
  await remove(ref(getDb(), `${institutionId}/tests/${testId}`));
}

export async function getTest(
  institutionId: string, testId: string,
): Promise<Test | null> {
  const snapshot = await get(ref(getDb(), `${institutionId}/tests/${testId}`));
  if (!snapshot.exists()) return null;
  return toTest(testId, snapshot.val() as Record<string, unknown>);
}

export async function listTestsPaged(
  institutionId: string,
  cursor: string | null = null,
  pageSize = 20,
): Promise<{ items: Test[]; nextCursor: string | null }> {
  const base = query(
    ref(getDb(), `${institutionId}/tests`),
    orderByChild('createdAt'), limitToFirst(pageSize + 1),
  );
  const snapshot = await get(cursor ? query(base, startAfter(cursor)) : base);
  if (!snapshot.exists()) return { items: [], nextCursor: null };
  const items: Test[] = [];
  snapshot.forEach((childSnap) => {
    items.push(toTest(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  const hasMore = items.length > pageSize;
  return {
    items: hasMore ? items.slice(0, pageSize) : items,
    nextCursor: hasMore ? String(items[pageSize - 1]?.createdAt ?? null) : null,
  };
}
// Questions
export async function createQuestion(input: {
  institutionId: string; testId: string;
  type: QuestionType; text: string; options: Record<string, string>;
  correct: AnswerChoice;
}): Promise<string> {
  const id = push(child(ref(getDb()), `${input.institutionId}/tests/${input.testId}/_questions`)).key;
  if (!id) throw new Error('Could not generate a question id.');
  const question = { id, type: input.type, text: input.text.trim(), options: input.options, correct: input.correct };
  await set(ref(getDb(), `${input.institutionId}/tests/${input.testId}/_questions/${id}`), question);
  const { correct: _, ...studentQuestion } = question;
  await set(ref(getDb(), `${input.institutionId}/tests/${input.testId}/_studentQuestions/${id}`), studentQuestion);
  return id;
}

export async function getTestQuestions(
  institutionId: string, testId: string,
): Promise<(Question & { correct: AnswerChoice })[]> {
  const snapshot = await get(ref(getDb(), `${institutionId}/tests/${testId}/_questions`));
  if (!snapshot.exists()) return [];
  const items: (Question & { correct: AnswerChoice })[] = [];
  snapshot.forEach((childSnap) => {
    items.push(toQuestionWithAnswer(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  return items;
}

export async function getTestStudentQuestions(
  institutionId: string, testId: string,
): Promise<Question[]> {
  const snapshot = await get(ref(getDb(), `${institutionId}/tests/${testId}/_studentQuestions`));
  if (!snapshot.exists()) return [];
  const items: Question[] = [];
  snapshot.forEach((childSnap) => {
    items.push(toQuestion(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  return items;
}
// Attempts
export async function saveAttempt(input: {
  institutionId: string; testId: string; studentUid: string;
  answers: Record<string, AnswerChoice>; startedAt: number; submittedAt: number;
  status: 'in_progress' | 'submitted';
}): Promise<void> {
  await set(ref(getDb(), `${input.institutionId}/tests/${input.testId}/_attempts/${input.studentUid}`), {
    testId: input.testId, studentUid: input.studentUid, answers: input.answers,
    startedAt: input.startedAt, submittedAt: input.submittedAt,
    status: input.status,
  });
}

export async function getAttempt(
  institutionId: string, testId: string, studentUid: string,
): Promise<TestAttempt | null> {
  const snapshot = await get(ref(getDb(),
    `${institutionId}/tests/${testId}/_attempts/${studentUid}`));
  if (!snapshot.exists()) return null;
  return toAttempt(studentUid, snapshot.val() as Record<string, unknown>);
}

export async function listAttempts(
  institutionId: string, testId: string,
): Promise<TestAttempt[]> {
  const snapshot = await get(ref(getDb(), `${institutionId}/tests/${testId}/_attempts`));
  if (!snapshot.exists()) return [];
  const items: TestAttempt[] = [];
  snapshot.forEach((childSnap) => {
    items.push(toAttempt(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  return items;
}
// Results
export async function saveResult(input: {
  institutionId: string; testId: string; studentUid: string;
  score: number; total: number; gradedAt: number; method: 'client' | 'server';
}): Promise<void> {
  await set(ref(getDb(), `${input.institutionId}/tests/${input.testId}/_results/${input.studentUid}`), {
    score: input.score, total: input.total, gradedAt: input.gradedAt, method: input.method,
  });
}

export async function getResult(
  institutionId: string, testId: string, studentUid: string,
): Promise<TestResult | null> {
  const snapshot = await get(ref(getDb(),
    `${institutionId}/tests/${testId}/_results/${studentUid}`));
  if (!snapshot.exists()) return null;
  return toResult(studentUid, snapshot.val() as Record<string, unknown>);
}

export async function listResults(
  institutionId: string, testId: string,
): Promise<{ studentUid: string; result: TestResult }[]> {
  const snapshot = await get(ref(getDb(), `${institutionId}/tests/${testId}/_results`));
  if (!snapshot.exists()) return [];
  const items: { studentUid: string; result: TestResult }[] = [];
  snapshot.forEach((childSnap) => {
    items.push({ studentUid: childSnap.key, result: toResult(childSnap.key, childSnap.val() as Record<string, unknown>) });
  });
  return items;
}