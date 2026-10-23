// src/components/admin/services/catalogQuery.ts
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listServicesAction } from '@/app/actions/admin/services';
import { unwrapAction } from '@/lib/unwrapAction';

export const CATALOG_QUERY_KEY = ['admin', 'services'] as const;

/** Catalogue complet (services archivés compris), partagé par la liste et la fiche d'un service. */
export function useCatalog() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEY,
    queryFn: async () => unwrapAction(await listServicesAction()).services,
  });
}

/** Recharge le catalogue après une mutation : la source de vérité reste le serveur. */
export function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY });
}
