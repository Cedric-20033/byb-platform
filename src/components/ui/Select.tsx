// src/components/ui/Select.tsx
'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

/**
 * Wrapper stylé autour du <select> natif — volontairement sans librairie
 * tierce (Base UI / Radix) : un select natif reste le plus accessible et le
 * plus simple à supporter sur mobile, et couvre tous nos besoins de filtres.
 */
export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-[var(--color-foreground)]">{label}</span>}
      <span className="relative">
        <select
          className={cn(
            'w-full appearance-none px-3 py-2 pr-9 rounded-[var(--radius-md)]',
            'border border-[var(--color-border)] bg-[var(--color-surface)]',
            'text-[var(--color-foreground)] cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
        />
      </span>
    </label>
  );
}
