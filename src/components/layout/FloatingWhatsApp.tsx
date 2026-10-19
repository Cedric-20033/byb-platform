// src/components/layout/FloatingWhatsApp.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const BUBBLE_FIRST_DELAY_MS = 3_000;
const BUBBLE_VISIBLE_DURATION_MS = 5_000;
const BUBBLE_REPEAT_INTERVAL_MS = 15_000;
/** Une fois fermée manuellement, la bulle ne revient plus pour la session en cours. */
const DISMISS_STORAGE_KEY = 'byb-whatsapp-bubble-dismissed';

/**
 * Bouton WhatsApp flottant.
 *
 * Contrairement au FloatingCTA "Prendre un RDV" (visible après 300px de
 * scroll), ce bouton est affiché en permanence, y compris tout en haut de
 * page — c'est le point d'entrée le plus direct vers l'entreprise.
 *
 * Pour attirer l'oeil sans être un simple bouton statique : un anneau pulse
 * en continu autour du logo, et une bulle de message apparaît/disparaît
 * périodiquement au-dessus. Elle peut être fermée explicitement, auquel cas
 * elle ne se réaffiche plus pour la session (sessionStorage).
 */
export function FloatingWhatsApp({ phoneNumber }: { phoneNumber: string }) {
  const t = useTranslations('whatsapp');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  // Initialisation paresseuse : ne lit sessionStorage que lors du premier
  // rendu client (le check `typeof window` protège le rendu serveur). Le
  // JSX ne dépendant pas de `dismissed`, aucun risque de désynchronisation
  // entre le HTML serveur et l'hydratation client.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (dismissed) return;

    let hideTimeout: ReturnType<typeof setTimeout>;
    let repeatInterval: ReturnType<typeof setInterval>;

    const showBubble = () => {
      setBubbleVisible(true);
      hideTimeout = setTimeout(() => setBubbleVisible(false), BUBBLE_VISIBLE_DURATION_MS);
    };

    const firstShow = setTimeout(() => {
      showBubble();
      repeatInterval = setInterval(showBubble, BUBBLE_REPEAT_INTERVAL_MS);
    }, BUBBLE_FIRST_DELAY_MS);

    return () => {
      clearTimeout(firstShow);
      clearTimeout(hideTimeout);
      clearInterval(repeatInterval);
    };
  }, [dismissed]);

  const dismissBubble = useCallback(() => {
    setBubbleVisible(false);
    setDismissed(true);
    sessionStorage.setItem(DISMISS_STORAGE_KEY, 'true');
  }, []);

  const whatsappDigits = phoneNumber.replace(/\D/g, '');
  // Numéro retiré des réglages : pas de bouton plutôt qu'un lien vers un numéro vide.
  if (!whatsappDigits) return null;
  const whatsappUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(t('prefillMessage'))}`;

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-2">
      <AnimatePresence>
        {bubbleVisible && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'relative max-w-[220px] rounded-2xl px-4 py-3',
              'bg-[var(--color-surface)] text-[var(--color-foreground)]',
              'shadow-[var(--shadow-lg)] text-sm leading-snug',
            )}
          >
            <button
              type="button"
              onClick={dismissBubble}
              aria-label={t('close')}
              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-foreground)] text-[var(--color-surface)]"
            >
              <X size={12} />
            </button>
            {t('bubbleMessage')}
          </motion.div>
        )}
      </AnimatePresence>

      <a
        href={whatsappUrl}
        data-testid="floating-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('ariaLabel')}
        onClick={dismissBubble}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-[var(--shadow-lg)] transition-transform duration-200 hover:scale-105"
      >
        {/* Anneau pulsant continu — attire l'oeil meme quand la bulle est masquee. */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-75 animate-ping" aria-hidden="true" />
        <WhatsAppIcon className="relative h-7 w-7 text-white" />
      </a>
    </div>
  );
}

/** Logo WhatsApp — absent de lucide-react (icônes de marque non incluses par défaut). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.017 2C6.489 2 2 6.487 2 12.011c0 1.94.539 3.822 1.556 5.467L2 22l4.662-1.53a10.03 10.03 0 0 0 5.355 1.545h.004c5.527 0 10.016-4.488 10.016-10.012C22.037 6.487 17.548 2 12.017 2zm0 18.223h-.003a8.19 8.19 0 0 1-4.175-1.145l-.299-.178-3.104 1.019.997-3.024-.195-.31a8.19 8.19 0 0 1-1.257-4.374c0-4.527 3.685-8.212 8.216-8.212a8.17 8.17 0 0 1 5.814 2.413 8.158 8.158 0 0 1 2.406 5.812c0 4.527-3.686 8.213-8.4 8.213z" />
    </svg>
  );
}
