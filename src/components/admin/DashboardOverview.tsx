// src/components/admin/DashboardOverview.tsx
'use client';

import type { Service } from '@/types';
import { Can } from './Can';
import { StatsWidget } from './dashboard/StatsWidget';
import { PendingAppointmentsWidget } from './dashboard/PendingAppointmentsWidget';
import { UpcomingAppointmentsWidget } from './dashboard/UpcomingAppointmentsWidget';
import { AppointmentInsightsWidget } from './dashboard/AppointmentInsightsWidget';
import { FreeSlotsWidget } from './dashboard/FreeSlotsWidget';

/**
 * Page d'accueil du dashboard : une composition de widgets indépendants.
 *
 * Chaque widget est enveloppé dans le droit qu'il exige (le même que celui de son action serveur) : sans le
 * droit, il n'est pas rendu et sa requête n'est jamais lancée. Chaque widget charge, échoue et se relance
 * seul : une panne sur l'un laisse les autres intacts. `services` vient du Server Component de la page.
 */
export function DashboardOverview({ services }: { services: Service[] }) {
  return (
    <div className="space-y-6">
      <Can domain="appointments" action="view">
        <StatsWidget />
      </Can>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Can domain="appointments" action="view">
          <PendingAppointmentsWidget services={services} />
          <UpcomingAppointmentsWidget services={services} />
          <AppointmentInsightsWidget services={services} />
        </Can>
        <Can domain="slots" action="view">
          <FreeSlotsWidget />
        </Can>
      </div>
    </div>
  );
}
