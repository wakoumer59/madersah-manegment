import React from 'react';
import type { LucideIcon } from 'lucide-react';

/** Chip color presets matching the mockups' pastel icon tiles. */
export type ChipTone = 'orange' | 'emerald' | 'violet' | 'sky' | 'rose';

const CHIP_STYLES: Record<ChipTone, string> = {
  orange: 'bg-orange-50 text-orange-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  sky: 'bg-sky-50 text-sky-600',
  rose: 'bg-rose-50 text-rose-600',
};

interface StatCardProps {
  label: string;
  /** pass null to render a loading placeholder — never a fake number */
  value: string | number | null;
  caption?: string;
  icon?: LucideIcon;
  tone?: ChipTone;
}

const StatCardInner = ({ label, value, caption, icon: Icon, tone = 'orange' }: StatCardProps) => {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {value === null ? (
          <div className="mt-2 h-8 w-14 animate-pulse rounded bg-slate-100" aria-hidden="true" />
        ) : (
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        )}
        {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
      </div>
      {Icon && (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CHIP_STYLES[tone]}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
    </div>
  );
};

export const StatCard = React.memo(StatCardInner);

