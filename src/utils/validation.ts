// Form validation helpers — pure functions, unit tested in tests/unit/.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidPassword(value: string): boolean {
  return value.length >= MIN_PASSWORD_LENGTH;
}

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface SignupFormValues {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function validateLoginForm(values: LoginFormValues): FieldErrors<LoginFormValues> {
  const errors: FieldErrors<LoginFormValues> = {};
  if (!isNonEmpty(values.email)) errors.email = 'Email is required.';
  else if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address.';
  if (!isNonEmpty(values.password)) errors.password = 'Password is required.';
  return errors;
}

export function validateSignupForm(values: SignupFormValues): FieldErrors<SignupFormValues> {
  const errors: FieldErrors<SignupFormValues> = {};
  if (!isNonEmpty(values.displayName)) errors.displayName = 'Name is required.';
  if (!isNonEmpty(values.email)) errors.email = 'Email is required.';
  else if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address.';
  if (!isValidPassword(values.password)) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}

export function hasFieldErrors(errors: FieldErrors<unknown>): boolean {
  return Object.keys(errors).length > 0;
}
