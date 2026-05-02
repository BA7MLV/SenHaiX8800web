import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Select = forwardRef(function Select(
  { className, error = false, options = [], placeholder, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-8 w-full appearance-none rounded-[var(--radius-input)] border bg-white px-3 pr-10 text-sm text-content-primary transition-all duration-150 ease-[var(--ease-apple)] focus:border-interactive focus:bg-white',
          error ? 'border-error-border' : 'border-line/50',
          className
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
    </div>
  );
});
