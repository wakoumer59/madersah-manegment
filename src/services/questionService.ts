import { child, get, orderByKey, push, query, ref, remove, set } from 'firebase/database';
import { getDb } from '@/firebase/init';
import type { AnswerChoice, QuestionWithAnswer } from '@/types';

export interface ChoiceQuestion extends QuestionWithAnswer {
  createdAt: number;
  createdBy: string;
}

function toChoiceQuestion(id: string, value: Record<string, unknown>): ChoiceQuestion {
  return {
    id,
    type: 'mcq',
    text: String(value.text ?? ''),
    options: (value.options as Record<string, string>) ?? {},
    correct: (value.correct as AnswerChoice) ?? 'A',
    createdAt: Number(value.createdAt ?? 0),
    createdBy: String(value.createdBy ?? ''),
  };
}

export async function listChoiceQuestions(institutionId: string): Promise<ChoiceQuestion[]> {
  const snapshot = await get(query(ref(getDb(), `${institutionId}/questionBank`), orderByKey()));
  if (!snapshot.exists()) return [];
  const questions: ChoiceQuestion[] = [];
  snapshot.forEach((childSnapshot) => {
    questions.push(
      toChoiceQuestion(childSnapshot.key, childSnapshot.val() as Record<string, unknown>),
    );
  });
  return questions.reverse();
}

export async function createChoiceQuestion(input: {
  institutionId: string;
  createdBy: string;
  text: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  correct: AnswerChoice;
}): Promise<string> {
  const id = push(child(ref(getDb()), `${input.institutionId}/questionBank`)).key;
  if (!id) throw new Error('Could not generate a question id.');
  await set(ref(getDb(), `${input.institutionId}/questionBank/${id}`), {
    id,
    type: 'mcq',
    text: input.text.trim(),
    options: Object.fromEntries(
      Object.entries(input.options).map(([choice, text]) => [choice, text.trim()]),
    ),
    correct: input.correct,
    createdBy: input.createdBy,
    createdAt: Date.now(),
  });
  return id;
}

export async function deleteChoiceQuestion(
  institutionId: string,
  questionId: string,
): Promise<void> {
  await remove(ref(getDb(), `${institutionId}/questionBank/${questionId}`));
}
