import { translate  } from '@/i18n';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  ClipboardList,
  FileStack,
  FolderOpen,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { StatCard } from '@/components/common/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { formatDisplayDate, todayIso } from '@/utils/dates';

const DASH = '—'; // honest placeholder until Phase 3/4 data connections land

export default function AdminDashboardPage() {
  const { userRecord, authUser } = useAuth();
  const name = userRecord?.displayName || authUser?.email || 'admin';

  return (
    <AppShell variant="admin">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">{translate("System overview")}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {translate("Welcome back,")}{' '}{name} · {formatDisplayDate(todayIso())}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label={translate("Students")} value={DASH} caption={translate("Total registered")} icon={Users} tone="orange" />
        <StatCard label={translate("Teachers")} value={DASH} caption={translate("Total staff")} icon={UserRound} tone="violet" />
        <StatCard label={translate("Present today")} value={DASH} caption={translate("Attendance")} icon={UserRoundCheck} tone="emerald" />
        <StatCard label={translate("Absent today")} value={DASH} caption={translate("Attendance")} icon={UserRoundX} tone="rose" />
        <StatCard label={translate("Active tests")} value={DASH} caption={translate("Online exams")} icon={ClipboardList} tone="sky" />
        <StatCard label={translate("Materials")} value={DASH} caption={translate("Learning files")} icon={FolderOpen} tone="emerald" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title={translate("Recent tests")}
          description={translate("Your latest online tests and their status")}
        >
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title={translate("No tests yet")}
            description={translate("Online tests appear here once they are created (Phase 5).")}
            action={
              <Link to="/admin/tests">
                <Button variant="secondary">{translate("Go to Online Tests")}</Button>
              </Link>
            }
          />
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
          <p className="mt-3 text-xs text-slate-400">
            {translate("Student, attendance, and materials sections arrive in Phases 3–6.")}{' '}</p>
        </Card>
      </div>
    </AppShell>
  );
}
