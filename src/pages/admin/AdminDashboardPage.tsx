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
        <h1 className="text-2xl font-bold text-slate-900">System overview</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Welcome back, {name} · {formatDisplayDate(todayIso())}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Students" value={DASH} caption="Total registered" icon={Users} tone="orange" />
        <StatCard label="Teachers" value={DASH} caption="Total staff" icon={UserRound} tone="violet" />
        <StatCard label="Present today" value={DASH} caption="Attendance" icon={UserRoundCheck} tone="emerald" />
        <StatCard label="Absent today" value={DASH} caption="Attendance" icon={UserRoundX} tone="rose" />
        <StatCard label="Active tests" value={DASH} caption="Online exams" icon={ClipboardList} tone="sky" />
        <StatCard label="Materials" value={DASH} caption="Learning files" icon={FolderOpen} tone="emerald" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Recent tests"
          description="Your latest online tests and their status"
        >
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="No tests yet"
            description="Online tests appear here once they are created (Phase 5)."
            action={
              <Link to="/admin/tests">
                <Button variant="secondary">Go to Online Tests</Button>
              </Link>
            }
          />
        </Card>

        <Card title="Quick actions" description="Shortcuts for everyday admin tasks">
          <div className="flex flex-col gap-2.5">
            <Link to="/admin/students">
              <Button className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" aria-hidden="true" /> Manage students
                </span>
                <span aria-hidden="true">→</span>
              </Button>
            </Link>
            <Link to="/admin/attendance">
              <Button variant="secondary" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" /> Take attendance
                </span>
                <span aria-hidden="true">→</span>
              </Button>
            </Link>
            <Link to="/admin/materials">
              <Button variant="secondary" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileStack className="h-4 w-4" aria-hidden="true" /> Upload material
                </span>
                <span aria-hidden="true">→</span>
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Student, attendance, and materials sections arrive in Phases 3–6.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
