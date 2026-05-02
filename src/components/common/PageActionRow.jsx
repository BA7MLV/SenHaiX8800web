import { cn } from '../../utils/cn';

export default function PageActionRow({ children, className, ...props }) {
  return (
    <div {...props} className={cn('flex flex-wrap items-center gap-3', className)}>
      {children}
    </div>
  );
}
