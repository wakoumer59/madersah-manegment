import { describe, expect, it } from 'vitest';
import {
  getQaidaWordIndexAtCharacter,
  getQaidaWordRanges,
  validateQaidaLesson,
} from '@/services/qaidaService';

describe('Qaida lesson validation', () => {
  it('requires a title and lesson text', () => {
    expect(validateQaidaLesson('', 'text')).toBe('Lesson title is required.');
    expect(validateQaidaLesson('Lesson 1', ' ')).toBe('Lesson text is required.');
  });

  describe('Qaida read-aloud word tracking', () => {
    it('finds Arabic word ranges without losing their text offsets', () => {
      const words = getQaidaWordRanges('بِسْمِ اللَّهِ');
      expect(words).toEqual([
        { text: 'بِسْمِ', start: 0, end: 6 },
        { text: 'اللَّهِ', start: 7, end: 14 },
      ]);
    });

    it('maps speech boundary character positions to the current word', () => {
      const words = getQaidaWordRanges('بِسْمِ اللَّهِ');
      expect(getQaidaWordIndexAtCharacter(words, 0)).toBe(0);
      expect(getQaidaWordIndexAtCharacter(words, 8)).toBe(1);
      expect(getQaidaWordIndexAtCharacter(words, 6)).toBeNull();
      expect(getQaidaWordIndexAtCharacter(words, -1)).toBeNull();
    });
  });

  it('limits title and text size', () => {
    expect(validateQaidaLesson('x'.repeat(101), 'text')).toBe('Lesson title is too long.');
    expect(validateQaidaLesson('Lesson 1', 'x'.repeat(20_001))).toBe('Lesson text is too long.');
  });

  it('accepts authorized lesson text within the limits', () => {
    expect(validateQaidaLesson('Lesson 1', 'بِسْمِ اللَّهِ')).toBeNull();
  });
});
