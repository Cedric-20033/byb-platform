// src/components/ui/Badge.tsx
import { cn } from '@/lib/utils';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--color-surface-raised)] text-[var(--color-muted)]',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]',
  info: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
