import { cn } from '../../utils/cn';

const variantClasses = {
  default: 'surface-panel',
  muted: 'surface-muted',
  success: 'rounded-[var(--radius-card)] border border-success-border bg-success-bg',
  error: 'rounded-[var(--radius-card)] border border-error-border bg-error-bg'
};

export function Card({ className, variant = 'default', title, description, actions, children }) {
  return (
    <section className={cn('p-4', variantClasses[variant], className)}>
      {(title || description || actions) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle pb-3">
          <div className="space-y-1">
            {title ? <h3 className="text-sm font-semibold text-content-primary">{title}</h3> : null}
            {description ? <p className="m-0 text-sm text-content-secondary">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
