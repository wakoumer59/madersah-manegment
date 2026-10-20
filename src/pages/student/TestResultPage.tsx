import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { getResult, getTest } from '@/services/testService';
import { errorMessage } from '@/utils/errors';
import { letterGrade } from '@/utils/grading';
import { formatDisplayDate } from '@/utils/dates';

export default function StudentTestResultPage() {
  const { userRecord, authUser } = useAuth();
  const { testId } = useParams<{ testId: string }>();
  const institutionId = userRecord?.institutionId ?? '';
  const studentUid = authUser?.uid ?? '';
  const [test, setTest] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!testId || !institutionId || !studentUid) return;
    setLoading(true);
    setError(null);
    try {
      const [t, r] = await Promise.all([getTest(institutionId, testId), getResult(institutionId, testId, studentUid)]);
      setTest(t);
      setResult(r);
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }, [testId, institutionId, studentUid]);
  useEffect(() => { void load(); }, [load]);

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

  if (!result) {
    return (
      <AppShell variant="student">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">{test.title}</h1>
          <p className="text-sm text-slate-500">Results</p>
        </div>
        <EmptyState icon={<User className="h-10 w-10" />} title="No result yet" description="You haven't taken this test yet, or results haven't been graded." />
      </AppShell>
    );
  }

  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <AppShell variant="student">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">{test.title}</h1>
        <p className="text-sm text-slate-500">Your results</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <div className="text-4xl font-bold text-orange-600 mb-2">{result.score} / {result.total}</div>
        <div className="text-2xl font-bold text-slate-900 mb-1">{pct}%</div>
        <div className={`text-lg font-semibold ${pct >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>{letterGrade(pct)}</div>
        <p className="mt-4 text-sm text-slate-500">
          Graded on {result.gradedAt ? formatDisplayDate(new Date(result.gradedAt).toISOString().split('T')[0]) : '—'}
        </p>
      </div>

      <div className="mt-6 flex justify-center">
        <Button variant="secondary">Back to tests</Button>
      </div>
    </AppShell>
  );
}