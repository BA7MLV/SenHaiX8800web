import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const Input = forwardRef(function Input(
  { className, error = false, type = 'text', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-8 w-full rounded-[var(--radius-input)] border bg-white px-3 text-sm text-content-primary placeholder:text-content-faint transition-all duration-150 ease-[var(--ease-apple)] focus:border-interactive focus:bg-white',
        error ? 'border-error-border' : 'border-line/50',
        className
      )}
      {...props}
    />
  );
});
