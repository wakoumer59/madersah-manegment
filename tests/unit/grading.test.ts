import { describe, expect, it } from 'vitest';
import { gradeTest, letterGrade } from '@/utils/grading';

describe('gradeTest', () => {
  it('scores correct answers', () => {
    const questions = [
      { id: 'q1', correct: 'A' },
      { id: 'q2', correct: 'B' },
      { id: 'q3', correct: 'C' },
    ];
    const answers = { q1: 'A', q2: 'B', q3: 'C' };
    expect(gradeTest(questions, answers)).toEqual({ score: 3, total: 3 });
  });

  it('scores zero for all wrong answers', () => {
    const questions = [{ id: 'q1', correct: 'A' }];
    const answers = { q1: 'B' };
    expect(gradeTest(questions, answers)).toEqual({ score: 0, total: 1 });
  });

  it('ignores unanswered questions', () => {
    const questions = [
      { id: 'q1', correct: 'A' },
      { id: 'q2', correct: 'B' },
    ];
    const answers = { q1: 'A' };
    expect(gradeTest(questions, answers)).toEqual({ score: 1, total: 2 });
  });

  it('handles empty question set', () => {
    expect(gradeTest([], {})).toEqual({ score: 0, total: 0 });
  });
});

describe('letterGrade', () => {
  it('returns correct letter grades', () => {
    expect(letterGrade(95)).toBe('A');
    expect(letterGrade(85)).toBe('B');
    expect(letterGrade(75)).toBe('C');
    expect(letterGrade(65)).toBe('D');
    expect(letterGrade(50)).toBe('F');
  });
});