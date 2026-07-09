// src/components/ui/ProgressBar.tsx
'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

NProgress.configure({ showSpinner: false, trickleSpeed: 100 });

/**
 * Barre de progression en haut de l'écran lors des changements de page.
 *
 * L'App Router de Next.js n'expose pas d'événements "navigation start/end"
 * comme le faisait l'ancien Pages Router — on approxime donc en démarrant la
 * barre dès le montage et en la terminant quand l'URL (pathname + query)
 * a fini de changer. Suffisant pour donner un retour visuel de chargement,
 * même si le déclenchement n'est pas millimétré au clic exact du lien.
 */
export function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    NProgress.start();
    const timeout = setTimeout(() => NProgress.done(), 300);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  return (
    <style jsx global>{`
      #nprogress .bar {
        background: var(--color-primary);
        height: 3px;
      }
      #nprogress .peg {
        box-shadow: 0 0 10px var(--color-primary), 0 0 5px var(--color-primary);
      }
    `}</style>
  );
}
