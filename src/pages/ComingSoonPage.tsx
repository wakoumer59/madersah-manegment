import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import {
  NAV_SECTIONS,
  type ShellVariant,
} from '@/components/layout/AdminSidebar';

// Which delivery phase ships each section (per implementation_plan.md).
const SECTION_PHASES: Record<string, string> = {
  students: 'Phase 3',
  teachers: 'Phase 3',
  classes: 'Phase 3',
  subjects: 'Phase 3',
  account: 'Phase 3',
  attendance: 'Phase 4',
  tests: 'Phase 5',
  results: 'Phase 5',
  materials: 'Phase 6',
  reports: 'Phase 4',
  settings: 'Phase 7',
};

export default function ComingSoonPage({ area }: { area: ShellVariant }) {
  const { section } = useParams<{ section: string }>();
  const items = NAV_SECTIONS[area].flatMap((entry) => entry.items);
  const item = items.find((candidate) => candidate.to.endsWith(`/${section ?? ''}`));
  const phase = (section && SECTION_PHASES[section]) || 'a later phase';

  return (
    <AppShell variant={area}>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        {item?.label ?? 'Coming soon'}
      </h1>
      <EmptyState
        title={`This section arrives in ${phase}`}
        description="The full page is being built and tested phase by phase. The navigation is
          already in place so you can review the layout."
      />
    </AppShell>
  );
}

