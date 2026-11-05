import { translate } from '@/i18n';

const englishStrings = {
  appName: 'Medresa LMS',
  tagline: 'Multi-Madrasah Learning Platform',
  nav: {
    dashboard: 'Dashboard',
    students: 'Students',
    teachers: 'Teachers',
    classes: 'Classes',
    subjects: 'Subjects',
    attendance: 'Attendance',
    tests: 'Online Questions',
    testResults: 'Test Results',
    materials: 'Learning Materials',
    board: 'Student Board',
    qaida: 'Qaida Nuraniya',
    quran: 'Quran & Reciters',
    reports: 'Reports',
    settings: 'Institution Settings',
    home: 'Home',
    myAttendance: 'My Attendance',
    myTests: 'Online Tests',
    myResults: 'My Results',
    account: 'My Account',
  },
  auth: {
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    signOut: 'Sign out',
    email: 'Email address',
    password: 'Password',
    displayName: 'Full name',
    confirmPassword: 'Confirm password',
    forgotPassword: 'Forgot password?',
    resetPassword: 'Send reset email',
    noAccount: "Don't have an account?",
    createAccount: 'Create account',
    creatingAccount: 'Creating account…',
    haveAccount: 'Already have an account?',
    registerInstitution: 'Register your madrasah',
    resetEmailSent: 'Password reset email sent. Check your inbox.',
    accountCreated: 'Your account has been created.',
  },
  common: {
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    retry: 'Retry',
    close: 'Close',
    confirm: 'Confirm',
    search: 'Search',
    next: 'Next',
    previous: 'Previous',
    comingSoon: 'Coming soon',
    reload: 'Reload page',
  },
  errors: {
    title: 'Something went wrong',
    generic: 'The operation failed. Please try again.',
    noConnection: 'No internet connection. Please check your network and try again.',
    invalidCredentials: 'Invalid email or password.',
    emailInUse: 'An account with this email already exists.',
    weakPassword: 'Password must be at least 8 characters.',
    tooManyRequests: 'Too many attempts. Please wait a moment and try again.',
    configMissing: 'Configuration required',
  },
  roles: {
    platformOwner: 'Platform Owner',
    institutionAdmin: 'Administrator',
    teacher: 'Teacher',
    student: 'Student',
    pending: 'Pending account',
  },
} as const;

function localize<T>(value: T): T {
  if (!value || typeof value !== 'object') {
    return (typeof value === 'string' ? translate(value) : value) as T;
  }
  return new Proxy(value, {
    get(target, property, receiver) {
      const child: unknown = Reflect.get(target, property, receiver);
      return typeof child === 'string' ? translate(child) : localize(child);
    },
  });
}

export const strings = localize(englishStrings);
