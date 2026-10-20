import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface PaginationProps {
  page: number;
  hasMore: boolean;
  onNext: () => void;
  onPrev: () => void;
  label?: ReactNode;
}

export function Pagination({ page, hasMore, onNext, onPrev, label }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <div className="text-sm text-slate-500">
        {label ?? `Page ${page}`}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasMore}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
