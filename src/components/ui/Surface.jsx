import { cn } from '../../utils/cn';

const variantClasses = {
  panel: 'surface-panel',
  muted: 'surface-muted',
  floating: 'surface-panel shadow-[var(--shadow-elevated)]',
  subtle: 'rounded-[var(--radius-card)] border border-line-subtle bg-white',
  dashed: 'rounded-[var(--radius-card)] border border-dashed border-line-strong bg-white',
  receipt: 'surface-receipt'
};

export function Surface({ className, variant = 'panel', children }) {
  return <div className={cn('p-5', variantClasses[variant], className)}>{children}</div>;
}
