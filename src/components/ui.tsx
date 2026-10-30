import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import type { Tone } from '../domain/labels';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'border-neutral-300 bg-neutral-100 text-neutral-800',
  info: 'border-navy-300 bg-navy-50 text-navy-800',
  warning: 'border-amber-500 bg-amber-50 text-amber-900',
  danger: 'border-red-600 bg-red-50 text-red-800',
  success: 'border-green-700 bg-green-50 text-green-800',
};

/** Status chip: always shows text; colour reinforces but never carries meaning alone. */
export function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy-800">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-neutral-700">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, id }: { title?: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="rounded border border-neutral-300 bg-white">
      {title && (
        <h2 id={id} className="border-b border-neutral-200 px-4 py-2 text-sm font-semibold text-navy-800">
          {title}
        </h2>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  const base =
    'focus-ring inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';
  const styles: Record<ButtonVariant, string> = {
    primary: 'border-navy-700 bg-navy-700 text-white hover:bg-navy-800',
    secondary: 'border-neutral-400 bg-white text-navy-800 hover:bg-neutral-100',
    danger: 'border-red-700 bg-red-700 text-white hover:bg-red-800',
  };
  return (
    <button
      {...rest}
      type={type}
      className={`${base} ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 py-8 text-sm text-neutral-700">
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded border border-red-600 bg-red-50 p-4 text-sm text-red-900">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p>{message}</p>
        {onRetry && (
          <Button variant="secondary" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export function SuccessMessage({ message }: { message: string }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded border border-green-700 bg-green-50 p-3 text-sm text-green-900">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded border border-dashed border-neutral-400 bg-white p-8 text-center">
      <p className="font-medium text-neutral-800">{title}</p>
      {description && <p className="mt-1 text-sm text-neutral-700">{description}</p>}
    </div>
  );
}

export function PermissionDenied({ message }: { message: string }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded border border-neutral-400 bg-neutral-100 p-4 text-sm text-neutral-800">
      <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

/** Labelled form field. Associates label, hint and error with the control via ids. */
export function FormField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-800">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-neutral-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'focus-ring block w-full rounded border border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-900 aria-[invalid=true]:border-red-600';
