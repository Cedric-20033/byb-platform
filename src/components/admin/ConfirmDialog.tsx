// src/components/admin/ConfirmDialog.tsx
'use client';

import { Dialog } from '@base-ui/react/dialog';
import { Button } from '@/components/ui/Button';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  isSubmitting?: boolean;
  /** Action destructrice ou à fort impact : bouton de confirmation en couleur d'alerte. */
  destructive?: boolean;
};

/** Modale de confirmation générique, sur la même fondation que CancelAppointmentDialog. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isSubmitting = false,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <Dialog.Title className="text-lg font-[var(--font-display)] font-bold mb-2">{title}</Dialog.Title>
            <Dialog.Description className="text-sm text-[var(--color-muted)]">{description}</Dialog.Description>

            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)] transition-colors">
                {cancelLabel}
              </Dialog.Close>
              <Button variant={destructive ? 'secondary' : 'primary'} isLoading={isSubmitting} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
