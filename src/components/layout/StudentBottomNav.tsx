import { NavLink } from 'react-router-dom';
import type { ShellVariant } from '@/components/layout/AdminSidebar';
import { NAV_SECTIONS } from '@/components/layout/AdminSidebar';

/**
 * Mobile bottom navigation (below md). Items are the first (unsectioned or
 * first-section) entries of the portal nav — quick access; the hamburger
 * drawer holds the full menu.
 */
export function BottomNav({
  variant,
  itemLimit = 4,
}: {
  variant: ShellVariant;
  itemLimit?: number;
}) {
  const items = NAV_SECTIONS[variant].flatMap((section) => section.items).slice(0, itemLimit);
  const activeFill = variant === 'student' ? '#4f46e5' : '#ea580c';

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/student' || item.to === '/owner'}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] font-medium ${
                  isActive ? 'text-current' : 'text-slate-400'
                }`
              }
              style={({ isActive }) => ({ color: isActive ? activeFill : undefined })}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{item.label.replace('My ', '')}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
