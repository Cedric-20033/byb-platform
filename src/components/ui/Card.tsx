// src/components/ui/Card.tsx
import { cn } from '@/lib/utils';

interface CardProps {
  children:  React.ReactNode;
  className?: string;
  hover?:     boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div className={cn(
      'bg-[var(--color-surface)] rounded-[var(--radius-lg)]',
      'border border-[var(--color-border)] shadow-[var(--shadow-sm)]',
      hover && 'transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-1',
      className
    )}>
      {children}
    </div>
  );
}