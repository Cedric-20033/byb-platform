// src/components/booking/useAvailableSlots.ts
'use client';

import { useEffect, useState } from 'react';
import { getAvailableSlotsAction, type SlotDTO } from '@/app/actions/booking/getAvailableSlots';
import type { ActionErrorCode } from '@/lib/errors';

/** Un visiteur qui hésite devant la grille voit un créneau disparaître au plus 15 s après sa réservation par un autre. */
export const SLOT_REFRESH_INTERVAL_MS = 15_000;

type SlotsResult = { key: string; slots: SlotDTO[]; error: ActionErrorCode | null };

export type AvailableSlotsState = {
  slots: SlotDTO[];
  /** Vrai tant que les créneaux de CETTE date n'ont pas été reçus une première fois (les rafraîchissements sont silencieux). */
  isLoading: boolean;
  error: ActionErrorCode | null;
};

/**
 * Créneaux libres d'un service pour un jour, tenus à jour pendant que la page reste ouverte.
 *
 * Rafraîchissement par interrogation périodique plutôt que par Realtime : la lecture est publique et
 * peu coûteuse, et les abonnements Realtime sur `slots` exigeraient d'exposer la table à tout visiteur.
 * L'interrogation est suspendue quand l'onglet est caché, et un retour sur l'onglet relit aussitôt
 * (un téléphone mis en veille revient avec une grille périmée).
 *
 * L'état de chargement est dérivé (`key` du résultat ≠ clé demandée) plutôt que stocké : changer de
 * jour ne déclenche aucun setState synchrone dans l'effet, et une réponse tardive d'un jour précédent
 * ne peut jamais s'afficher sous le jour courant.
 */
export function useAvailableSlots(
  serviceId: string,
  date: string,
  refreshIntervalMs: number = SLOT_REFRESH_INTERVAL_MS,
): AvailableSlotsState {
  const key = `${serviceId}|${date}`;
  const [result, setResult] = useState<SlotsResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await getAvailableSlotsAction({ serviceId, from: date, to: date });
      if (cancelled) return;

      setResult((previous) => {
        if (response.success) return { key, slots: response.slots, error: null };
        // Une panne passagère pendant un rafraîchissement ne doit pas vider une grille déjà affichée.
        if (previous?.key === key) return previous;
        return { key, slots: [], error: response.error };
      });
    }

    void load();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, refreshIntervalMs);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [serviceId, date, key, refreshIntervalMs]);

  const current = result && result.key === key ? result : null;
  return {
    slots: current?.slots ?? [],
    isLoading: current === null,
    error: current?.error ?? null,
  };
}
