// src/components/booking/client/ClientAppointmentPageShell.tsx
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

type ClientAppointmentPageShellProps = {
  heading: string;
  intro: string;
  children: ReactNode;
};

/** Mise en page commune des pages « annuler » et « modifier » : bandeau de titre puis carte centrée. */
export function ClientAppointmentPageShell({ heading, intro, children }: ClientAppointmentPageShellProps) {
  return (
    <>
      <section className="section-padding bg-[var(--color-primary)] text-white diagonal-bottom">
        <div className="container-custom text-center pb-8">
          <h1 className="text-4xl lg:text-6xl font-[var(--font-display)] font-black">{heading}</h1>
          <p className="text-white/70 text-lg mt-4 max-w-xl mx-auto">{intro}</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <Card className="max-w-2xl mx-auto p-6 sm:p-8">{children}</Card>
        </div>
      </section>
    </>
  );
}
