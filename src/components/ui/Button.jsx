import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const variantClasses = {
  primary: [
    'border border-interactive bg-interactive text-content-inverse',
    'hover:bg-interactive-hover',
    'disabled:border-interactive-disabled-bg disabled:bg-interactive-disabled-bg disabled:text-interactive-disabled-text'
  ].join(' '),
  secondary: [
    'border border-line bg-white text-content-primary',
    'hover:border-line-strong hover:bg-surface-muted hover:text-content-primary',
    'disabled:border-line/30 disabled:bg-surface-muted/70 disabled:text-content-faint disabled:shadow-none'
  ].join(' '),
  danger: [
    'border border-error-solid bg-error-solid text-content-inverse',
    'hover:opacity-95',
    'disabled:border-line-subtle disabled:bg-surface-muted disabled:text-content-faint disabled:shadow-none'
  ].join(' '),
  ghost: [
    'border-transparent bg-transparent text-content-secondary shadow-none',
    'hover:bg-surface-muted hover:text-content-primary',
    'disabled:text-content-faint'
  ].join(' '),
  approve: 'border-transparent bg-success-solid text-content-inverse hover:opacity-95',
  warn: 'border-transparent bg-warning-solid text-content-inverse hover:opacity-95'
};

const sizeClasses = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'min-h-11 min-w-11 gap-2 px-5 py-2.5 text-sm'
};

export const Button = forwardRef(function Button(
  { className, variant = 'primary', size = 'md', loading = false, icon, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-button)] border font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-apple)] active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon ? <span className="shrink-0" aria-hidden>{icon}</span> : null}
      {children}
    </button>
  );
});
