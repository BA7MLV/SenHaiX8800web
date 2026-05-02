import { cn } from '../../utils/cn';

export function PageTitleBar({ title, actions, className }) {
  return (
    <section className={cn('surface-panel flex min-h-[56px] items-center justify-between gap-3 px-4 py-3', className)}>
      {title ? <h1 className="m-0 text-xl font-semibold text-content-primary">{title}</h1> : <span />}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}
