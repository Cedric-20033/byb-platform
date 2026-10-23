// src/components/admin/AdminDialog.tsx
'use client';

import type { ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';

type AdminDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  closeLabel: string;
  children: ReactNode;
};

/**
 * Coque commune des modales du back-office : fond, popup centrée, titre, description et bouton de
 * fermeture. Le contenu (formulaire, actions) est fourni par l'appelant.
 *
 * Base UI ne monte le contenu qu'à l'ouverture : un formulaire placé dans `children` repart donc
 * d'un état neuf à chaque ouverture, sans code de réinitialisation.
 */
export function AdminDialog({ open, onOpenChange, title, description, closeLabel, children }: AdminDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <Dialog.Title className="text-lg font-[var(--font-display)] font-bold">{title}</Dialog.Title>
              <Dialog.Close aria-label={closeLabel} className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-[var(--color-muted)] mb-4">{description}</Dialog.Description>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
