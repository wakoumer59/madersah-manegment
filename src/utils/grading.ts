// Pure auto-grading function. Compares student answers against the
// correct answers keyed by question id. Returns score and total.
export function gradeTest(
  questions: { id: string; correct: string }[],
  answers: Record<string, string>,
): { score: number; total: number } {
  let score = 0;
  for (const q of questions) {
    if (answers[q.id] !== undefined && answers[q.id] === q.correct) {
      score += 1;
    }
  }
  return { score, total: questions.length };
}

/** Returns the letter grade for a percentage score (0-100). */
export function letterGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}