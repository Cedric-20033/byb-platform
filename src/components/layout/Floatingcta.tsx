// src/components/layout/FloatingCTA.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isBookingPagePath } from '@/lib/booking/bookingRoutes';
import { shouldShowFloatingCta } from '@/lib/floatingCta';
import type { Service } from '@/types';
import { BookingDialog } from '@/components/booking/BookingDialog';

type FloatingCTAProps = {
  services: Service[];
};

/**
 * Bouton flottant « Prendre un RDV », monté une seule fois par `PublicChrome` : il est donc présent sur
 * toutes les pages publiques (404 comprise) et jamais dans le dashboard ni sur le login.
 *
 * Il surgit au défilement (voir `shouldShowFloatingCta`) et ouvre le wizard de réservation. Tant qu'il est
 * caché, il est aussi `inert` : sans cela, un bouton transparent resterait atteignable au clavier et
 * lisible par les lecteurs d'écran.
 *
 * Sa place, en bas à droite sous le bouton WhatsApp, est réservée dans le footer (voir `Footer`).
 */
export function FloatingCTA({ services }: FloatingCTAProps) {
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const update = () =>
      setVisible(
        shouldShowFloatingCta({
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
        }),
      );

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // Le contenu change de hauteur après l'hydratation (images, sections chargées) : on re-mesure alors.
    // L'observateur déclenche aussi une première mesure, d'où l'absence d'appel direct à update().
    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, []);

  // La page /rdv affiche déjà le wizard en pleine page : l'ouvrir aussi en modale
  // ferait écraser l'état de l'un par l'autre (store Zustand partagé).
  if (isBookingPagePath(pathname)) return null;

  return (
    <>
      <div
        inert={!visible}
        className={cn(
          'fixed bottom-6 right-6 z-40 transition-all duration-300 motion-reduce:transition-none',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none',
        )}
      >
        <button
          type="button"
          data-testid="floating-cta"
          onClick={() => setDialogOpen(true)}
          aria-label={tNav('bookAppointment')}
          className={cn(
            'flex items-center gap-2 px-5 py-3',
            'bg-[var(--color-secondary)] text-white',
            'font-[var(--font-display)] font-bold text-sm uppercase tracking-wide',
            'rounded-full shadow-[var(--shadow-lg)]',
            'hover:bg-[var(--color-secondary-hover)] hover:scale-105 transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
          )}
        >
          <CalendarDays size={18} aria-hidden="true" />
          <span className="hidden sm:inline">{tNav('bookAppointment')}</span>
        </button>
      </div>

      <BookingDialog services={services} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
