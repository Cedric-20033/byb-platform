// src/components/ui/ThemeToggle.tsx
'use client';

import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
// Importe useTheme depuis notre ThemeProvider local, pas depuis next-themes
import { useTheme } from '@/components/ui/ThemeProvider';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Évite le flash SSR : le composant ne s'affiche qu'après hydratation
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return <div className={cn('w-9 h-9', className)} />;

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      className={cn(
        'w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)]',
        'text-[var(--color-muted)] hover:text-[var(--color-foreground)]',
        'hover:bg-[var(--color-surface-raised)] transition-colors duration-200',
        className
      )}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
