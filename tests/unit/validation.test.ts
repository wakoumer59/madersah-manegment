import { describe, expect, it } from 'vitest';
import {
  hasFieldErrors,
  isValidEmail,
  isValidPassword,
  validateLoginForm,
  validateSignupForm,
} from '@/utils/validation';

describe('isValidEmail', () => {
  it('accepts common valid addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail(' first.last@mail.madrasah.org ')).toBe(true);
  });

  it('rejects invalid addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('plain')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('requires at least 8 characters', () => {
    expect(isValidPassword('12345678')).toBe(true);
    expect(isValidPassword('1234567')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });
});

describe('validateLoginForm', () => {
  it('returns no errors for valid input', () => {
    const errors = validateLoginForm({ email: 'a@b.com', password: 'secret123' });
    expect(hasFieldErrors(errors)).toBe(false);
  });

  it('flags empty and malformed fields', () => {
    const errors = validateLoginForm({ email: '', password: '' });
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();

    const malformed = validateLoginForm({ email: 'not-an-email', password: 'x' });
    expect(malformed.email).toBeTruthy();
  });
});

describe('validateSignupForm', () => {
  const valid = {
    displayName: 'Test Teacher',
    email: 'teacher@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  };

  it('returns no errors for valid input', () => {
    expect(hasFieldErrors(validateSignupForm(valid))).toBe(false);
  });

  it('requires a display name', () => {
    expect(validateSignupForm({ ...valid, displayName: ' ' }).displayName).toBeTruthy();
  });

  it('rejects short passwords', () => {
    expect(validateSignupForm({ ...valid, password: 'short', confirmPassword: 'short' }).password)
      .toBeTruthy();
  });

  it('rejects mismatched confirm passwords', () => {
    expect(
      validateSignupForm({ ...valid, confirmPassword: 'different1' }).confirmPassword,
    ).toBeTruthy();
  });
});
