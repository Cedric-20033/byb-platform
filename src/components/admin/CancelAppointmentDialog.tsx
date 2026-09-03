// src/components/admin/CancelAppointmentDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

type CancelAppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isSubmitting: boolean;
};

/**
 * Petite modale de confirmation avant annulation d'un RDV, avec un champ de
 * message optionnel transmis au client dans l'email d'annulation.
 * Même fondation que BookingDialog (@base-ui/react) pour rester cohérent
 * avec le reste de l'application plutôt que de réinventer un composant modal.
 */
export function CancelAppointmentDialog({ open, onOpenChange, onConfirm, isSubmitting }: CancelAppointmentDialogProps) {
  const t = useTranslations('admin.appointments');
  const [reason, setReason] = useState('');

  function handleConfirm() {
    onConfirm(reason.trim());
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason('');
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-[var(--font-display)] font-bold">
                {t('cancelDialogTitle')}
              </Dialog.Title>
              <Dialog.Close
                aria-label="Fermer"
                className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                <X size={20} />
              </Dialog.Close>
            </div>

            <p className="text-sm text-[var(--color-muted)] mb-3">{t('cancelDialogDescription')}</p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder={t('cancelReasonPlaceholder')}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />

            <div className="flex justify-end gap-2 mt-4">
              <Dialog.Close
                className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                {t('cancelDialogDismiss')}
              </Dialog.Close>
              <Button variant="secondary" isLoading={isSubmitting} onClick={handleConfirm}>
                {t('cancelDialogConfirm')}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
