import { translate  } from '@/i18n';
import { Link } from 'react-router-dom';
import { BookOpen, BookText, BarChart3, CalendarCheck, ClipboardList, MessageSquareText, School } from 'lucide-react';
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

      <Link
        to="/student/board"
        className="mb-5 flex min-h-16 items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-900 transition-colors hover:bg-indigo-100"
      >
        <MessageSquareText className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{translate('Student Board')}</span>
          <span className="block text-sm text-indigo-800">
            {translate('Read the latest school updates and posts.')}
          </span>
        </span>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>
      <Link
        to="/student/qaida"
        className="mb-5 flex min-h-16 items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-950 transition-colors hover:bg-amber-100"
      >
        <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{translate('Qaida Nuraniya')}</span>
          <span className="block text-sm text-amber-900">
            {translate('Read and listen to your lessons.')}
          </span>
        </span>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>
      <Link
        to="/student/quran"
        className="mb-5 flex min-h-16 items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-950 transition-colors hover:bg-emerald-100"
      >
        <BookText className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{translate('Quran & Reciters')}</span>
          <span className="block text-sm text-emerald-900">
            {translate('Read and listen to the Quran with different reciters.')}
          </span>
        </span>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>

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
