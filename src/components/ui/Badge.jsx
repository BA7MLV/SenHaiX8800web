import { cn } from '../../utils/cn';

const variantClasses = {
  default: 'border-line/50 bg-surface-card/92 text-content-secondary',
  success: 'border-success-border bg-success-bg text-success',
  warning: 'border-warning-border bg-warning-bg text-warning',
  error: 'border-error-border bg-error-bg text-error',
  info: 'border-info-border bg-info-bg text-info'
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-[11px]'
};

export function Badge({ className, variant = 'default', size = 'md', children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}
