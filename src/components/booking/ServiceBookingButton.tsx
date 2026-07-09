// src/components/booking/ServiceBookingButton.tsx
'use client';

import { useState } from 'react';
import type { Service } from '@/types';
import { Button } from '@/components/ui/Button';
import { BookingDialog } from './BookingDialog';

type ServiceBookingButtonProps = {
  services: Service[];
  initialService: Service;
  label: string;
  className?: string;
};

/**
 * CTA "Demander un devis pour ce service" affiché sur une fiche service
 * (src/app/[locale]/(public)/services/[slug]/page.tsx).
 *
 * Wrapper client minimal : la page qui l'utilise reste un Server Component,
 * seul ce bouton (et le dialogue qu'il ouvre) a besoin d'interactivité.
 */
export function ServiceBookingButton({ services, initialService, label, className }: ServiceBookingButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <BookingDialog
        services={services}
        initialService={initialService}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
