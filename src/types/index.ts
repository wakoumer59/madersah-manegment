// Shared domain types for the whole application.
// Institution-owned entities live under /{institutionId}/... in the Realtime
// Database, so institutionId is implied by the path and not duplicated.

export type UserRole = 'platformOwner' | 'institutionAdmin' | 'teacher' | 'student' | 'pending';
export type UserStatus = 'pending' | 'active' | 'inactive' | 'suspended';
export type InstitutionStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface Institution {
  id: string;
  name: string;
  status: InstitutionStatus;
  contactEmail: string;
  phone: string;
  address: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  /** null only for platformOwner and pre-approval pending users */
  institutionId: string | null;
  /** students only */
  classId: string | null;
  createdAt: number;
}

export interface Student {
  /** same as Firebase Auth uid — single identity record */
  uid: string;
  displayName: string;
  email: string;
  classId: string;
  admissionNo: string;
  status: UserStatus;
  createdAt: number;
}

export interface Teacher {
  uid: string;
  displayName: string;
  email: string;
  status: UserStatus;
  createdAt: number;
}

export interface SchoolClass {
  id: string;
  name: string;
  academicYear: string;
  teacherUid: string | null;
  /** denormalized counter, transaction-maintained */
  studentCount: number;
  createdAt: number;
}

export interface Subject {
  id: string;
  name: string;
  classId: string;
  teacherUid: string | null;
  createdAt: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceEntry {
  status: AttendanceStatus;
  note?: string;
  markedBy: string;
  /** server timestamp */
  updatedAt: number;
}

export interface AttendanceDayMeta {
  markedBy: string;
  markedAt: number;
  counts: { present: number; absent: number; late: number; excused: number };
}

export type QuestionType = 'mcq' | 'truefalse';
export type AnswerChoice = 'A' | 'B' | 'C' | 'D';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  /** mcq: {A,B,C,D}; truefalse: {A:'True',B:'False'} */
  options: Record<string, string>;
}

export interface QuestionWithAnswer extends Question {
  correct: AnswerChoice;
}

export type TestStatus = 'draft' | 'published' | 'closed';

export interface Test {
  id: string;
  title: string;
  description: string;
  classId: string;
  subjectId: string | null;
  /** epoch ms — validated against server `now` in Security Rules */
  startTime: number;
  endTime: number;
  /** UX + eligibility; rules enforce the real deadline */
  durationMin: number;
  maxScore: number;
  status: TestStatus;
  /** result visibility to students */
  showResults: boolean;
  questionCount: number;
  createdBy: string;
  createdAt: number;
}

export interface TestAttempt {
  testId: string;
  studentUid: string;
  answers: Record<string, AnswerChoice>;
  startedAt: number;
  submittedAt: number;
  status: 'in_progress' | 'submitted';
}

export interface TestResult {
  score: number;
  total: number;
  gradedAt: number;
  /** 'client' auto-grading in v1; 'server' reserved for future Cloud Function */
  method: 'client' | 'server';
}

export interface Material {
  id: string;
  title: string;
  description: string;
  /** null = whole institution */
  classId: string | null;
  subjectId: string | null;
  visibility: 'class' | 'institution';
  fileName: string;
  contentType: string;
  /** bytes */
  size: number;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  createdAt: number;
  /** best-effort, transaction-maintained */
  downloadCount: number;
}

export interface InstitutionRequest {
  id: string;
  institutionName: string;
  contactEmail: string;
  phone: string;
  address: string;
  /** uid of the person who will become institutionAdmin */
  requesterUid: string;
  requesterName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string;
  reviewedBy: string | null;
  createdAt: number;
  reviewedAt: number | null;
}

/** One-time activation/invite code — replaces paid SMS for onboarding. */
export interface PendingAccount {
  code: string;
  email: string;
  displayName: string;
  role: 'student' | 'teacher';
  institutionId: string;
  classId: string | null;
  status: 'unused' | 'used';
  createdBy: string;
  createdAt: number;
  usedBy: string | null;
}

export interface Paged<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  presentToday: number;
  absentToday: number;
  activeTests: number;
  materialCount: number;
}
