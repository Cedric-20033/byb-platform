// src/components/admin/useAppointmentsRealtime.ts
'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/infrastructure/supabase/client';

export type AppointmentChange = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** Ligne après le changement (colonnes SQL en snake_case) ; null pour une suppression. */
  newRow: Record<string, unknown> | null;
};

/**
 * S'abonne aux changements de la table `appointments` (Supabase Realtime) et appelle `onChange` à chacun.
 *
 * La RLS s'applique au flux : l'admin ne reçoit que les rendez-vous qu'il a le droit de lire. L'abonnement est
 * ouvert à l'affichage du composant et fermé à son démontage ; le rappel est lu à son dernier état (ref), de sorte
 * qu'un changement de rappel n'oblige jamais à rouvrir le canal.
 */
export function useAppointmentsRealtime(onChange: (change: AppointmentChange) => void): void {
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        const hasRow = payload.new && Object.keys(payload.new).length > 0;
        latest.current({ eventType: payload.eventType, newRow: hasRow ? payload.new : null });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
}
