// src/components/admin/dashboard/useWidgetQuery.ts
'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Chargement d'un widget du dashboard : une requête indépendante par widget, pour qu'une panne ou un refus
 * sur l'un n'empêche jamais l'affichage des autres.
 *
 * `error` n'est renseigné que s'il n'y a AUCUNE donnée à montrer : un rafraîchissement raté (réseau mobile,
 * veille de l'ordinateur) garde les derniers chiffres connus plutôt que de les remplacer par un message d'erreur.
 * Les clés commencent par `['admin', 'dashboard']` : la mise à jour temps réel des rendez-vous les rafraîchit.
 */
export function useWidgetQuery<T>(queryKey: readonly unknown[], load: () => Promise<T>) {
  const query = useQuery({ queryKey, queryFn: load });

  return {
    data: query.data,
    isPending: query.isPending,
    error: query.data === undefined ? query.error : null,
    retry: () => void query.refetch(),
  };
}
