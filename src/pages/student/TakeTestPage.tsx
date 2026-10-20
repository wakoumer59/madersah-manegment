import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { getAttempt, getTestStudentQuestions, saveAttempt, saveResult } from '@/services/testService';
import { gradeTest } from '@/utils/grading';
import { errorMessage } from '@/utils/errors';
import type { Question, AnswerChoice } from '@/types';

interface TestMeta {
  id: string; title: string; description: string; durationMin: number;
  maxScore: number; startTime: number; endTime: number;
}

export default function TakeTestPage() {
  const { userRecord, authUser } = useAuth();
  const { testId } = useParams<{ testId: string }>();
  const institutionId = userRecord?.institutionId ?? '';
  const studentUid = authUser?.uid ?? '';
  const [test, setTest] = useState<TestMeta | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const startTimeRef = useRef<number>(0);

  const load = useCallback(async () => {
    if (!testId || !institutionId || !studentUid) return;
    setLoading(true);
    setError(null);
    try {
      const [t, qs, existingAttempt] = await Promise.all([
        fetchTest(institutionId, testId),
        getTestStudentQuestions(institutionId, testId),
        getAttempt(institutionId, testId, studentUid),
      ]);
      setTest(t);
      setQuestions(qs);
      setAttempt(existingAttempt);
      if (existingAttempt) {
        setAnswers(existingAttempt.answers || {});
        startTimeRef.current = existingAttempt.startedAt;
      } else {
        startTimeRef.current = Date.now();
      }
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }, [testId, institutionId, studentUid]);
  useEffect(() => { void load(); }, [load]);

  async function fetchTest(institutionId: string, testId: string): Promise<TestMeta | null> {
    const { getTest } = await import('@/services/testService');
    const t = await getTest(institutionId, testId);
    if (!t) return null;
    return { id: t.id, title: t.title, description: t.description, durationMin: t.durationMin, maxScore: t.maxScore, startTime: t.startTime, endTime: t.endTime };
  }
  const timeLeft = useCallback(() => {
    if (!test) return 0;
    const elapsed = Date.now() - startTimeRef.current;
    return Math.max(0, test.durationMin * 60 * 1000 - elapsed);
  }, [test]);

  const hasSubmitted = attempt?.status === 'submitted';

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!testId || !institutionId || !studentUid || !test) return;
    const interval = setInterval(() => {
      void saveAttempt({
        institutionId, testId: testId!, studentUid,
        answers: answers as Record<string, AnswerChoice>, startedAt: startTimeRef.current, submittedAt: 0,
        status: 'in_progress',
      }).catch(() => { /* silent */ });
    }, 30000);
    return () => clearInterval(interval);
  }, [testId, institutionId, studentUid, test, answers]);

  const handleAnswerChange = (questionId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const now = Date.now();
      await saveAttempt({
        institutionId, testId: testId!, studentUid,
        answers: answers as Record<string, AnswerChoice>, startedAt: startTimeRef.current, submittedAt: now,
        status: 'submitted',
      });

      // Auto-grade client-side
      const { getTestQuestions } = await import('@/services/testService');
      const questionsWithCorrect = await getTestQuestions(institutionId, testId!);
      const { score, total } = gradeTest(questionsWithCorrect, answers);

      await saveResult({
        institutionId, testId: testId!, studentUid,
        score, total, gradedAt: now, method: 'client',
      });

      setShowSubmitConfirm(false);
      setShowResults(true);
    } catch (err) { setError(errorMessage(err)); } finally { setSubmitting(false); }
  };
  if (loading) return <LoadingSpinner fullPage />;
  if (error || !test) {
    return (
      <AppShell variant="student">
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || 'Test not found'}
        </div>
      </AppShell>
    );
  }

  const now = Date.now();
  const testStarted = now >= test.startTime && now <= test.endTime;
  const timeLeftMs = timeLeft();
  const minutes = Math.floor(timeLeftMs / 60000);
  const seconds = Math.floor((timeLeftMs % 60000) / 1000);

  if (!testStarted) {
    return (
      <AppShell variant="student">
        <div className="text-center py-10">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Test not yet available</h2>
          <p className="mt-2 text-sm text-slate-500">{test.title} starts at {new Date(test.startTime).toLocaleString()}.</p>
        </div>
      </AppShell>
    );
  }

  if (hasSubmitted && !showResults) {
    return (
      <AppShell variant="student">
        <div className="text-center py-10">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Test submitted</h2>
          <p className="mt-2 text-sm text-slate-500">Your answers have been recorded.</p>
          <Button onClick={() => setShowResults(true)} className="mt-6">View results</Button>
        </div>
      </AppShell>
    );
  }

  if (showResults) {
    return (
      <AppShell variant="student">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Results</h1>
          <p className="text-sm text-slate-500 mb-6">{test.title}</p>
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <div className="text-4xl font-bold text-orange-600">0 / 0</div>
            <p className="text-sm text-slate-500">Results will be available when published.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <AppShell variant="student">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{test.title}</h1>
          <p className="text-sm text-slate-500">{test.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${timeLeftMs <= 60000 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
            <Clock className="h-3.5 w-3.5 mr-1" /> {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-500">Answered {answeredCount} of {questions.length} questions</p>

      <form noValidate className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                {String.fromCharCode(65 + questions.indexOf(q))}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{q.text}</p>
                {q.type === 'mcq' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(['A', 'B', 'C', 'D'] as const).map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => handleAnswerChange(q.id, choice)}
                        className={`w-full py-2 rounded border text-sm text-left transition-colors ${answers[q.id] === choice ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {choice}. {q.options[choice] || ''}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'truefalse' && (
                  <div className="mt-3 flex gap-3">
                    {(['A', 'B'] as const).map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => handleAnswerChange(q.id, choice)}
                        className={`flex-1 py-2 rounded border text-sm transition-colors ${answers[q.id] === choice ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {choice}. {choice === 'A' ? 'True' : 'False'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </form>

      <div className="mt-6 flex justify-end">
        <Button variant="secondary" onClick={() => setShowSubmitConfirm(true)}>Submit test</Button>
      </div>

      <ConfirmDialog
        open={showSubmitConfirm}
        title="Submit test?"
        message="You won't be able to change your answers after submitting. Are you sure?"
        confirmLabel="Submit"
        busy={submitting}
        onConfirm={handleSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
      />
    </AppShell>
  );
}