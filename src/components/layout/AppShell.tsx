import { translate  } from '@/i18n';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { GraduationCap, MessageCircleQuestion, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AppSidebar,
  NavSections,
  UserChip,
  type ShellVariant,
} from '@/components/layout/AdminSidebar';
import { BottomNav } from '@/components/layout/StudentBottomNav';
import { TopBar } from '@/components/layout/TopBar';
import { strings } from '@/strings';

interface AppShellProps {
  variant: ShellVariant;
  children: ReactNode;
}

/**
 * Application chrome: sidebar on desktop; hamburger drawer + bottom
 * quick-navigation on mobile. Accent color follows the portal variant
 * (orange for admin/owner, indigo for students) per the approved mockups.
 */
export function AppShell({ variant, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes (nav click).
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar variant={variant} />
      <div className="md:pl-64">
        <TopBar variant={variant} onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav variant={variant} itemLimit={variant === 'student' ? 5 : 4} />
      <Link
        to="/help"
        aria-label={translate('Open System Help')}
        title={translate('System Help')}
        className={`fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:bottom-5 ${
          variant === 'student'
            ? 'bg-indigo-600 focus-visible:outline-indigo-600'
            : 'bg-orange-600 focus-visible:outline-orange-600'
        }`}
      >
        <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" />
      </Link>

      {/* Mobile slide-over drawer with the full sectioned menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={translate("Navigation menu")}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: variant === 'student' ? '#4f46e5' : '#ea580c' }}
                >
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{strings.appName}</p>
                  <p className="text-xs text-slate-500">{strings.tagline}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={translate("Close menu")}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              <NavSections variant={variant} />
            </div>
            <UserChip variant={variant} />
          </div>
        </div>
      )}
    </div>
  );
}
