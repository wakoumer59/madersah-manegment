import { useId, type InputHTMLAttributes } from 'react';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

const INPUT_CLASSES =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 ' +
  'focus:ring-orange-500/30 disabled:bg-slate-50 disabled:text-slate-500';

export function FormInput({ label, error, hint, className = '', ...rest }: FormInputProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${INPUT_CLASSES} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {!error && hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}
