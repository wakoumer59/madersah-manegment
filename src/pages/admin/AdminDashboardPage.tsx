import { translate  } from '@/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  ClipboardList,
  FileStack,
  FolderOpen,
  GraduationCap,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatCard } from '@/components/common/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { formatDisplayDate, todayIso } from '@/utils/dates';
import { getAdminDashboardSummary, type AdminDashboardSummary } from '@/services/dashboardService';
import { errorMessage } from '@/utils/errors';

export default function AdminDashboardPage() {
  const { userRecord, authUser } = useAuth();
  const institutionId = userRecord?.institutionId ?? '';
  const name = userRecord?.displayName || authUser?.email || 'admin';
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!institutionId) {
      setSummary(null);
      setError(translate('Your institution could not be determined.'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      setSummary(await getAdminDashboardSummary(institutionId));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <AppShell variant="admin">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">{translate("System overview")}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {translate("Welcome back,")}{' '}{name} · {formatDisplayDate(todayIso())}
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-medium underline">
            {translate("Retry")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        <StatCard label={translate("Students")} value={summary?.totalStudents ?? (loading ? null : '—')} caption={translate("Total registered")} icon={Users} tone="orange" />
        <StatCard label={translate("Teachers")} value={summary?.totalTeachers ?? (loading ? null : '—')} caption={translate("Total staff")} icon={UserRound} tone="violet" />
        <StatCard label={translate("Classes")} value={summary?.totalClasses ?? (loading ? null : '—')} caption={translate("Total classes")} icon={GraduationCap} tone="orange" />
        <StatCard label={translate("Present today")} value={summary?.presentToday ?? (loading ? null : '—')} caption={translate("Attendance")} icon={UserRoundCheck} tone="emerald" />
        <StatCard label={translate("Absent today")} value={summary?.absentToday ?? (loading ? null : '—')} caption={translate("Attendance")} icon={UserRoundX} tone="rose" />
        <StatCard label={translate("Active tests")} value={summary?.activeTests ?? (loading ? null : '—')} caption={translate("Online exams")} icon={ClipboardList} tone="sky" />
        <StatCard label={translate("Materials")} value={summary?.materialCount ?? (loading ? null : '—')} caption={translate("Learning files")} icon={FolderOpen} tone="emerald" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title={translate("Recent tests")}
          description={translate("Your latest online tests and their status")}
        >
          {loading && !summary ? (
            <LoadingSpinner />
          ) : error && !summary ? (
            <p className="text-sm text-slate-500">{translate("Dashboard data could not be loaded.")}</p>
          ) : summary?.recentTests.length ? (
            <ul className="divide-y divide-slate-100">
              {summary.recentTests.map((test) => (
                <li key={test.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{test.title}</p>
                    <p className="text-xs text-slate-500">{formatDisplayDate(todayIso(new Date(test.createdAt)))}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {translate(test.status)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<ClipboardList className="h-10 w-10" />}
              title={translate("No tests yet")}
              description={translate("Create your first test to assess your students.")}
              action={
                <Link to="/admin/questions">
                  <Button variant="secondary">{translate("Go to Online Questions")}</Button>
                </Link>
              }
            />
          )}
        </Card>

        <Card title={translate("Quick actions")} description={translate("Shortcuts for everyday admin tasks")}>
          <div className="flex flex-col gap-2.5">
            <Link to="/admin/students">
              <Button className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" aria-hidden="true" /> {' '}{translate("Manage students")}{' '}</span>
                <span aria-hidden="true">→</span>
              </Button>
            </Link>
            <Link to="/admin/attendance">
              <Button variant="secondary" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" /> {' '}{translate("Take attendance")}{' '}</span>
                <span aria-hidden="true">→</span>
              </Button>
            </Link>
            <Link to="/admin/materials">
              <Button variant="secondary" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileStack className="h-4 w-4" aria-hidden="true" /> {' '}{translate("Upload material")}{' '}</span>
                <span aria-hidden="true">→</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
