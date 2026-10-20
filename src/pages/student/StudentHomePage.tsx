import { BookOpen, BarChart3, CalendarCheck, ClipboardList, School } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { StatCard } from '@/components/common/StatCard';
import { useAuth } from '@/contexts/AuthContext';

const DASH = '—'; // honest placeholder until Phase 3/4/5 data connections land

export default function StudentHomePage() {
  const { userRecord, authUser } = useAuth();
  const name = userRecord?.displayName || authUser?.email || 'student';

  return (
    <AppShell variant="student">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {name} 👋</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Here is what is happening with your learning.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="My class" value={DASH} caption="Assigned by your school" icon={School} tone="sky" />
        <StatCard label="Tests" value={DASH} caption="Available online tests" icon={ClipboardList} tone="violet" />
        <StatCard label="Results" value={DASH} caption="Your latest scores" icon={BarChart3} tone="orange" />
        <StatCard label="Attendance" value={DASH} caption="Your attendance rate" icon={CalendarCheck} tone="emerald" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="My subjects">
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            title="No subjects yet"
            description="Your class subjects and teachers will appear here once your school sets them up (Phase 3)."
          />
        </Card>
        <Card title="Attendance overview">
          <EmptyState
            icon={<CalendarCheck className="h-10 w-10" />}
            title="No attendance recorded yet"
            description="A summary of your present, absent, and late days will appear here (Phase 4)."
          />
        </Card>
      </div>
    </AppShell>
  );
}
