import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const variantClasses = {
  default: [
    'border-line bg-white text-content-secondary shadow-none',
    'hover:border-line-strong hover:bg-surface-muted hover:text-content-primary',
    'disabled:border-line/30 disabled:bg-surface-muted/70 disabled:text-content-faint disabled:shadow-none'
  ].join(' '),
  ghost: [
    'border-transparent bg-transparent text-content-secondary shadow-none',
    'hover:bg-surface-muted hover:text-content-primary',
    'disabled:text-content-faint'
  ].join(' ')
};

const sizeClasses = {
  sm: 'size-8',
  md: 'size-9',
  lg: 'min-h-11 min-w-11'
};

export const IconButton = forwardRef(function IconButton(
  { icon, variant = 'default', size = 'md', active = false, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-button)] border transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-apple)] active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        active && 'border-line-strong bg-surface-muted text-content-primary',
        className
      )}
      {...props}
    >
      <span className="shrink-0" aria-hidden>{icon ?? children}</span>
    </button>
  );
});
