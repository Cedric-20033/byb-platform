// src/components/ui/DateInput.tsx
'use client';

import { cn } from '@/lib/utils';

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/**
 * Sélecteur de date — input natif type="date" plutôt qu'une librairie tierce
 * (react-day-picker, etc.) : le clavier/le calendrier natif du système
 * d'exploitation est déjà accessible, localisé et tactile-friendly, ce qui
 * couvre entièrement les besoins de filtres/formulaires du dashboard.
 * Si un calendrier visuel type "range picker" devient nécessaire (ex. vue
 * planning), ce fichier est le seul point à remplacer.
 */
export function DateInput({ label, className, ...props }: DateInputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-[var(--color-foreground)]">{label}</span>}
      <input
        type="date"
        className={cn(
          'px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)]',
          'bg-[var(--color-surface)] text-[var(--color-foreground)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
          className,
        )}
        {...props}
      />
    </label>
  );
}
