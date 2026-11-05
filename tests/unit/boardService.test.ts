import { describe, expect, it } from 'vitest';
import {
  validateBoardMedia,
  validateBoardText,
  validateGoogleMeetUrl,
} from '@/services/boardService';

function makeFile(type: string, size: number): File {
  const file = new File([], 'upload', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('student board validation', () => {
  it('accepts secure Google Meet links and rejects other or unsafe URLs', () => {
    expect(validateGoogleMeetUrl('')).toBeNull();
    expect(validateGoogleMeetUrl('https://meet.google.com/abc-defg-hij')).toBeNull();
    expect(validateGoogleMeetUrl('https://meet.google.com/lookup/meeting-id?authuser=0')).toBeNull();
    expect(validateGoogleMeetUrl('http://meet.google.com/abc-defg-hij')).toContain('valid Google Meet');
    expect(validateGoogleMeetUrl('https://meet.google.com.evil.example/abc')).toContain('valid Google Meet');
    expect(validateGoogleMeetUrl('javascript:alert(1)')).toContain('valid Google Meet');
    expect(validateGoogleMeetUrl('https://meet.google.com')).toContain('valid Google Meet');
  });

  it('accepts supported image and video types up to their size limits', () => {
    expect(validateBoardMedia(makeFile('image/jpeg', 10 * 1024 * 1024))).toBeNull();
    expect(validateBoardMedia(makeFile('video/mp4', 25 * 1024 * 1024))).toBeNull();
    expect(validateBoardMedia(makeFile('video/webm', 1024))).toBeNull();
  });

  it('rejects unsupported media and files over the size limits', () => {
    expect(validateBoardMedia(makeFile('image/png', 10 * 1024 * 1024 + 1))).toBe(
      'Images must be 10 MB or smaller.',
    );
    expect(validateBoardMedia(makeFile('video/mp4', 25 * 1024 * 1024 + 1))).toBe(
      'Videos must be 25 MB or smaller.',
    );
    expect(validateBoardMedia(makeFile('application/pdf', 100))).toContain('Choose a JPG');
  });

  it('requires a title and either message text or media', () => {
    expect(validateBoardText('', 'Message')).toBe('Post title is required.');
    expect(validateBoardText('Update', '')).toBe('Write a message or attach an image or video.');
    expect(validateBoardText('Update', '', true)).toBeNull();
    expect(validateBoardText('Live lesson', '', false, true)).toBeNull();
    expect(validateBoardText('x'.repeat(121), 'Message')).toBe(
      'Post title must be 120 characters or fewer.',
    );
    expect(validateBoardText('Update', 'x'.repeat(5001))).toBe(
      'Post text must be 5,000 characters or fewer.',
    );
  });
});
