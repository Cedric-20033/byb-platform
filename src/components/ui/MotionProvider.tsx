// src/components/ui/MotionProvider.tsx
'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Applique la préférence système « réduire les animations » à toutes les animations framer-motion
 * (WCAG 2.3.3). Le CSS global ne couvre que les transitions CSS : sans ce provider, les animations pilotées
 * par JavaScript (apparition au défilement, compteurs) ignoreraient le réglage.
 * `reducedMotion="user"` désactive les mouvements de transformation tout en gardant les fondus d'opacité.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
