import { cn } from '../../utils/cn';

export function Switch({ checked, onChange, label, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-all duration-150 ease-[var(--ease-apple)]',
        className
      )}
    >
      <span
        className={cn(
          'relative flex h-6 w-11 items-center rounded-full border transition-all duration-150 ease-[var(--ease-apple)]',
          checked ? 'border-transparent bg-interactive' : 'border-line/60 bg-surface-muted'
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-[var(--ease-apple)]',
            checked && 'translate-x-5'
          )}
        />
      </span>
    </button>
  );
}
