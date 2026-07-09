// src/components/admin/StatCard.tsx
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone?: 'primary' | 'secondary' | 'neutral';
}

const toneStyles = {
  primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  secondary: 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]',
  neutral: 'bg-[var(--color-surface-raised)] text-[var(--color-muted)]',
};

/**
 * cette carte affiche une statistique avec une icône, un label et une valeur.
 * le paramètre `tone` permet de changer la couleur de l'icône et du fond.
 * @param param0 
 * @returns 
 */
export function StatCard({ icon: Icon, label, value, tone = 'neutral' }: StatCardProps) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0', toneStyles[tone])}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-[var(--font-display)] font-black leading-none">{value}</p>
        <p className="text-sm text-[var(--color-muted)] mt-1 truncate">{label}</p>
      </div>
    </Card>
  );
}
