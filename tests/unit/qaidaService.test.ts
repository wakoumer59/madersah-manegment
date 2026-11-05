import { describe, expect, it } from 'vitest';
import { validateQaidaLesson } from '@/services/qaidaService';

describe('Qaida lesson validation', () => {
  it('requires a title and lesson text', () => {
    expect(validateQaidaLesson('', 'text')).toBe('Lesson title is required.');
    expect(validateQaidaLesson('Lesson 1', ' ')).toBe('Lesson text is required.');
  });

  it('limits title and text size', () => {
    expect(validateQaidaLesson('x'.repeat(101), 'text')).toBe('Lesson title is too long.');
    expect(validateQaidaLesson('Lesson 1', 'x'.repeat(20_001))).toBe('Lesson text is too long.');
  });

  it('accepts authorized lesson text within the limits', () => {
    expect(validateQaidaLesson('Lesson 1', 'بِسْمِ اللَّهِ')).toBeNull();
  });
});
