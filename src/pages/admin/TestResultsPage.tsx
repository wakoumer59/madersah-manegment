import { useCallback, useEffect, useState } from 'react';
import { BarChart3, User } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { listResults, listTestsPaged } from '@/services/testService';
import { listStudentsPaged } from '@/services/studentService';
import { errorMessage } from '@/utils/errors';
import { letterGrade } from '@/utils/grading';
import { formatDisplayDate } from '@/utils/dates';
import type { Test } from '@/types';

export default function TestResultsPage() {
  const { userRecord } = useAuth();
  const institutionId = userRecord?.institutionId ?? '';
  const [tests, setTests] = useState<Test[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [results, setResults] = useState<{ studentUid: string; result: any }[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [studentOptions, setStudentOptions] = useState<{ uid: string; displayName: string }[]>([]);

  const loadTests = useCallback(async () => {
    setError(null);
    try {
      const [testPage, studentPage] = await Promise.all([
        listTestsPaged(institutionId, cursor),
        listStudentsPaged(institutionId),
      ]);
      setTests(testPage.items);
      setCursor(testPage.nextCursor);
      setStudentOptions(studentPage.items.map((s) => ({ uid: s.uid, displayName: s.displayName })));
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }, [cursor, institutionId]);
  useEffect(() => { void loadTests(); }, [loadTests]);

  const loadResults = useCallback(async () => {
    if (!selectedTestId) return;
    setResultsLoading(true);
    try {
      const resultsList = await listResults(institutionId, selectedTestId);
      setResults(resultsList);
    } catch (err) { setError(errorMessage(err)); } finally { setResultsLoading(false); }
  }, [selectedTestId, institutionId]);
  useEffect(() => { void loadResults(); }, [selectedTestId, loadResults]);
  if (loading) return <LoadingSpinner fullPage />;
  if (error) {
    return (
      <AppShell variant="admin">
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error} <button type="button" onClick={() => void loadTests()} className="font-medium underline ml-2">Retry</button>
        </div>
      </AppShell>
    );
  }

  const selectedTest = tests.find((t) => t.id === selectedTestId);

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Test Results</h1>
          <p className="text-sm text-slate-500">Review student results for published tests.</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-slate-700">Select a test</label>
        <select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)} className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30">
          <option value="">Choose a test…</option>
          {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {!selectedTestId && (
        <EmptyState icon={<BarChart3 className="h-10 w-10" />} title="Select a test" description="Choose a test from the dropdown to view its results." />
      )}

      {selectedTestId && resultsLoading && <LoadingSpinner fullPage />}
      {selectedTestId && !resultsLoading && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedTest?.title}</h2>
              <p className="text-sm text-slate-500">Results for {selectedTest?.classId}</p>
            </div>
            {selectedTest && (
              <Button variant="secondary" onClick={() => setSelectedTestId('')}>Choose another test</Button>
            )}
          </div>

          {results.length === 0 && (
            <EmptyState icon={<User className="h-10 w-10" />} title="No results yet" description="No students have submitted this test yet." />
          )}

          {results.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-left border-b border-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Student</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">Score</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">Percentage</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">Grade</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Graded at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map(({ studentUid, result }) => {
                    const student = studentOptions.find((s) => s.uid === studentUid);
                    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
                    return (
                      <tr key={studentUid} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">{student?.displayName || studentUid}</td>
                        <td className="px-4 py-3 text-sm text-center font-medium">{result.score} / {result.total}</td>
                        <td className="px-4 py-3 text-sm text-center">{pct}%</td>
                        <td className="px-4 py-3 text-sm text-center font-semibold">{letterGrade(pct)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{result.gradedAt ? formatDisplayDate(new Date(result.gradedAt).toISOString().split('T')[0]) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}