// src/components/booking/BookingDialog.tsx
'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Service } from '@/types';
import { BookingWizard } from './BookingWizard';

type BookingDialogProps = {
  services: Service[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Service à présélectionner à l'ouverture (ex : bouton "Demander un devis"
   * sur une fiche service). Le wizard saute alors directement à l'étape
   * sous-service ou créneau, sans repasser par le choix du service.
   */
  initialService?: Service;
};

/**
 * Fenêtre modale hébergeant le wizard de réservation, ouverte depuis
 * le bouton "Prendre RDV" flottant (FloatingCTA) sur n'importe quelle page.
 *
 * Construit sur @base-ui/react (headless, accessible — focus trap, fermeture
 * Échap/clic extérieur gérés nativement) plutôt que sur un composant maison,
 * puisque la librairie est déjà une dépendance du projet.
 */
export function BookingDialog({ services, open, onOpenChange, initialService }: BookingDialogProps) {
  const tBooking = useTranslations('booking');
  const tCommon = useTranslations('common');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-[var(--font-display)] font-bold">
                {tBooking('dialogTitle')}
              </Dialog.Title>
              <Dialog.Close
                aria-label={tCommon('close')}
                className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                <X size={20} />
              </Dialog.Close>
            </div>

            <BookingWizard services={services} initialService={initialService} />
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
