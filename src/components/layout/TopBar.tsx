import { useLocation } from 'react-router-dom';
import { GraduationCap, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/common/Button';
import {
  findNavItem,
  type ShellVariant,
} from '@/components/layout/AdminSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { strings } from '@/strings';

const PORTAL_LABEL: Record<ShellVariant, string> = {
  admin: 'Admin',
  owner: 'Platform',
  student: 'Student',
};

interface TopBarProps {
  variant: ShellVariant;
  onOpenMenu: () => void;
}

export function TopBar({ variant, onOpenMenu }: TopBarProps) {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const pageTitle = findNavItem(pathname, variant)?.label ?? strings.appName;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="-ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white md:hidden"
          style={{ backgroundColor: variant === 'student' ? '#4f46e5' : '#ea580c' }}
        >
          <GraduationCap className="h-4.5 w-4.5" />
        </span>
        {/* Breadcrumb: Portal › Page (desktop) */}
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
          <span className="font-semibold text-slate-900">{PORTAL_LABEL[variant]}</span>
          <span className="text-slate-300">›</span>
          <span className="truncate text-slate-500">{pageTitle}</span>
        </nav>
        <span className="truncate text-sm font-semibold text-slate-900 md:hidden">
          {pageTitle}
        </span>
      </div>
      <Button
        variant="secondary"
        onClick={signOut}
        className="min-h-[38px] shrink-0 px-3 py-1.5"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{strings.auth.signOut}</span>
      </Button>
    </header>
  );
}
