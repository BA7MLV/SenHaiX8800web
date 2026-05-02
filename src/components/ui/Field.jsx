import { cn } from '../../utils/cn';

export function Field({ className, label, hint, children }) {
  return (
    <label className={cn('flex w-full flex-col gap-2', className)}>
      {label ? <span className="text-xs font-medium uppercase tracking-[0.08em] text-content-muted">{label}</span> : null}
      {children}
      {hint ? <span className="text-xs text-content-faint">{hint}</span> : null}
    </label>
  );
}
