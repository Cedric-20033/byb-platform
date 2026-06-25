// src/components/layout/FloatingCTA.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalizedPath, Locale } from '@/lib/routing';

/**
 * Bouton flottant "Prendre un RDV" — visible après 300px de scroll.
 *
 * Utilise la clé fr.json : "nav.bookAppointment"
 * Phase 2 : remplacer le href="/contact" par l'ouverture du wizard de réservation.
 */
export function FloatingCTA() {
  // Réutilise la clé nav.bookAppointment de fr.json — pas de nouvelle clé
  const tNav = useTranslations('nav');
  const locale = useLocale() as Locale;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-40 transition-all duration-300',
      visible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
    )}>
      <a
        href={getLocalizedPath('/contact', locale)}
        aria-label={tNav('bookAppointment')}
        className={cn(
          'flex items-center gap-2 px-5 py-3',
          'bg-[var(--color-secondary)] text-white',
          'font-[var(--font-display)] font-bold text-sm uppercase tracking-wide',
          'rounded-full shadow-[var(--shadow-lg)]',
          'hover:bg-[var(--color-secondary-hover)] hover:scale-105 transition-all duration-200'
        )}
      >
        <CalendarDays size={18} />
        <span className="hidden sm:inline">{tNav('bookAppointment')}</span>
      </a>
    </div>
  );
}