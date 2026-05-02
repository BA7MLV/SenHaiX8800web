import { cn } from '../../utils/cn';

export function PageLayout({ className, children }) {
  return <div className={cn('flex w-full flex-col gap-5', className)}>{children}</div>;
}
