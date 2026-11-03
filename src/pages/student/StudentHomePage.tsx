import { translate  } from '@/i18n';
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
        <h1 className="text-2xl font-bold text-slate-900">{translate("Welcome back,")}{' '}{name} 👋</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {translate("Here is what is happening with your learning.")}{' '}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={translate("My class")} value={DASH} caption={translate("Assigned by your school")} icon={School} tone="sky" />
        <StatCard label={translate("Tests")} value={DASH} caption={translate("Available online tests")} icon={ClipboardList} tone="violet" />
        <StatCard label={translate("Results")} value={DASH} caption={translate("Your latest scores")} icon={BarChart3} tone="orange" />
        <StatCard label={translate("Attendance")} value={DASH} caption={translate("Your attendance rate")} icon={CalendarCheck} tone="emerald" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title={translate("My subjects")}>
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            title={translate("No subjects yet")}
            description={translate("Your class subjects and teachers will appear here once your school sets them up (Phase 3).")}
          />
        </Card>
        <Card title={translate("Attendance overview")}>
          <EmptyState
            icon={<CalendarCheck className="h-10 w-10" />}
            title={translate("No attendance recorded yet")}
            description={translate("A summary of your present, absent, and late days will appear here (Phase 4).")}
          />
        </Card>
      </div>
    </AppShell>
  );
}
