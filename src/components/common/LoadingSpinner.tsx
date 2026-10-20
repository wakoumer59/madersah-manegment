interface LoadingSpinnerProps {
  label?: string;
  /** renders centered in the remaining viewport space */
  fullPage?: boolean;
}

export function LoadingSpinner({ label = 'Loading…', fullPage = false }: LoadingSpinnerProps) {
  const content = (
    <div className="flex items-center justify-center gap-3 text-slate-500">
      <svg className="h-6 w-6 animate-spin text-orange-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
        <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  );
  if (!fullPage) return content;
  return <div className="flex min-h-[50vh] items-center justify-center">{content}</div>;
}
