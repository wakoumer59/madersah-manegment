import { useCallback, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { getAttempt, listTestsPaged } from '@/services/testService';
import { errorMessage } from '@/utils/errors';
import type { Test } from '@/types';

export default function StudentTestListPage() {
  const { userRecord, authUser } = useAuth();
  const institutionId = userRecord?.institutionId ?? '';
  const classId = userRecord?.classId ?? '';
  const [tests, setTests] = useState<Test[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [attemptMap, setAttemptMap] = useState<Record<string, { status: string; submittedAt: number }>>({});

  const load = useCallback(async () => {
    if (!institutionId || !classId) return;
    setLoading(true);
    setError(null);
    try {
      const testPage = await listTestsPaged(institutionId, cursor);
      const now = Date.now();
      const available = testPage.items.filter(
        (t) => t.classId === classId && t.status === 'published' && now >= t.startTime && now <= t.endTime,
      );
      setTests(available);
      setCursor(testPage.nextCursor);
      setHasMore(!!testPage.nextCursor);

      // Load attempt status for each test
      const attemptMap: Record<string, { status: string; submittedAt: number }> = {};
      for (const t of available) {
        if (!authUser) continue;
        const attempt = await getAttempt(institutionId, t.id, authUser.uid);
        if (attempt) attemptMap[t.id] = { status: attempt.status, submittedAt: attempt.submittedAt };
      }
      setAttemptMap(attemptMap);
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }, [cursor, institutionId, classId, authUser?.uid]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <LoadingSpinner fullPage />;
  if (error) {
    return (
      <AppShell variant="student">
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error} <button type="button" onClick={() => void load()} className="font-medium underline ml-2">Retry</button>
        </div>
      </AppShell>
    );
  }

  if (tests.length === 0) {
    return (
      <AppShell variant="student">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">Online Tests</h1>
          <p className="text-sm text-slate-500">Available tests for your class.</p>
        </div>
        <EmptyState icon={<ClipboardList className="h-10 w-10" />} title="No tests available" description="There are no active tests for your class right now." />
      </AppShell>
    );
  }

  return (
    <AppShell variant="student">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Online Tests</h1>
        <p className="text-sm text-slate-500">Available tests for your class.</p>
      </div>

      <DataTable<Test>
        columns={[
          { key: 'title', label: 'Test Title' },
          { key: 'durationMin', label: 'Duration', render: (t) => `${t.durationMin} min` },
          {
            key: 'status', label: 'Your status',
            render: (t) => {
              const attempt = attemptMap[t.id];
              if (!attempt) return <span className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-600">Not started</span>;
              if (attempt.status === 'submitted') return <span className="px-2 py-1 rounded text-xs bg-emerald-100 text-emerald-700">Submitted</span>;
              return <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-700">In progress</span>;
            },
          },
          {
            key: 'actions', label: '',
            render: (t) => {
              const attempt = attemptMap[t.id];
              const alreadySubmitted = attempt?.status === 'submitted';
              if (alreadySubmitted) {
                return <Button variant="secondary" onClick={() => {}} disabled>View result</Button>;
              }
              return <Button onClick={() => {}}>Start test</Button>;
            },
          },
        ]}
        items={tests}
      />
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => setCursor((c) => c ?? '')} className="w-full sm:w-auto">Load more</Button>
        </div>
      )}
    </AppShell>
  );
}