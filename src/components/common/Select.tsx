import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}

const SELECT_CLASSES =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 ' +
  'focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30';

export function Select({ label, error, children, className = '', ...rest }: SelectProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={`${SELECT_CLASSES} ${error ? 'border-red-500' : ''}`}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
