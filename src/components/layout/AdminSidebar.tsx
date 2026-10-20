import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Gauge,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  School,
  Settings,
  Users,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { strings } from '@/strings';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  soon?: boolean;
}
export interface NavSection {
  title?: string;
  items: NavItem[];
}
export type ShellVariant = 'admin' | 'student' | 'owner';

/** Accent palette per portal — matches the approved mockups. */
export const ACCENTS: Record<ShellVariant, { active: string; chip: string }> = {
  admin: { active: 'bg-orange-50 text-orange-700', chip: 'bg-orange-600' },
  owner: { active: 'bg-orange-50 text-orange-700', chip: 'bg-orange-600' },
  student: { active: 'bg-indigo-50 text-indigo-700', chip: 'bg-indigo-600' },
};

export const NAV_SECTIONS: Record<ShellVariant, NavSection[]> = {
  admin: [
    { items: [{ label: strings.nav.dashboard, to: '/admin', icon: LayoutDashboard }] },
    {
      title: 'Academics',
      items: [
        { label: strings.nav.students, to: '/admin/students', icon: Users },
        { label: strings.nav.teachers, to: '/admin/teachers', icon: UserRound },
        { label: strings.nav.classes, to: '/admin/classes', icon: School },
        { label: strings.nav.subjects, to: '/admin/subjects', icon: BookOpen },
        { label: strings.nav.attendance, to: '/admin/attendance', icon: CalendarCheck },
      ],
    },
    {
      title: 'Assessments',
      items: [
        { label: strings.nav.tests, to: '/admin/tests', icon: ClipboardList },
        { label: strings.nav.testResults, to: '/admin/results', icon: BarChart3 },
      ],
    },
    {
      title: 'Content',
      items: [
        { label: strings.nav.materials, to: '/admin/materials', icon: FolderOpen },
        { label: strings.nav.reports, to: '/admin/reports', icon: FileText, soon: true },
      ],
    },
    {
      title: 'System',
      items: [{ label: strings.nav.settings, to: '/admin/settings', icon: Settings, soon: true }],
    },
  ],
  student: [
    { items: [{ label: strings.nav.home, to: '/student', icon: GraduationCap }] },
    {
      title: 'My learning',
      items: [
        { label: strings.nav.myAttendance, to: '/student/attendance', icon: CalendarCheck, soon: true },
        { label: strings.nav.myTests, to: '/student/tests', icon: ClipboardList },
        { label: strings.nav.myResults, to: '/student/results', icon: BarChart3 },
        { label: strings.nav.materials, to: '/student/materials', icon: FolderOpen },
      ],
    },
    {
      title: 'Account',
      items: [{ label: strings.nav.account, to: '/student/account', icon: UserRound, soon: true }],
    },
  ],
  owner: [
    { items: [{ label: 'Overview', to: '/owner', icon: Gauge }] },
    {
      title: 'Platform',
      items: [
        { label: 'Institution Requests', to: '/owner/requests', icon: Inbox },
        { label: 'Institutions', to: '/owner/institutions', icon: Building2 },
      ],
    },
  ],
};

export function findNavItem(pathname: string, variant: ShellVariant): NavItem | undefined {
  const flat = NAV_SECTIONS[variant].flatMap((section) => section.items);
  return [...flat]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) =>
      item.to === `/${variant}` ? pathname === item.to : pathname.startsWith(item.to),
    );
}

function NavItemLink({ item, variant }: { item: NavItem; variant: ShellVariant }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/admin' || item.to === '/student' || item.to === '/owner'}
      className={({ isActive }) =>
        `flex min-h-[42px] items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? `font-semibold ${ACCENTS[variant].active}`
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.soon && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          Soon
        </span>
      )}
    </NavLink>
  );
}

/** Full sectioned navigation — shared by the desktop sidebar and mobile drawer. */
export function NavSections({ variant }: { variant: ShellVariant }) {
  return (
    <div className="flex flex-col gap-4">
      {NAV_SECTIONS[variant].map((section, index) => (
        <div key={section.title ?? index}>
          {section.title && (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
          )}
          <nav className="flex flex-col gap-0.5" aria-label={section.title ?? 'Main navigation'}>
            {section.items.map((item) => (
              <NavItemLink key={item.to} item={item} variant={variant} />
            ))}
          </nav>
        </div>
      ))}
    </div>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Pinned-at-bottom profile chip (matches the mockup's admin footer). */
export function UserChip({ variant }: { variant: ShellVariant }) {
  const { authUser, userRecord } = useAuth();
  const name = userRecord?.displayName || authUser?.email || 'User';
  const roleLabel = userRecord ? strings.roles[userRecord.role] : '';
  return (
    <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${ACCENTS[variant].chip}`}
      >
        {initialsOf(name) || 'U'}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{roleLabel || authUser?.email}</p>
      </div>
    </div>
  );
}

/** Desktop sidebar (hidden below md). */
export function AppSidebar({ variant }: { variant: ShellVariant }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-3 px-4 py-4">
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${ACCENTS[variant].chip}`}
        >
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{strings.appName}</p>
          <p className="text-xs text-slate-500">{strings.tagline}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <NavSections variant={variant} />
      </div>
      <UserChip variant={variant} />
    </aside>
  );
}

