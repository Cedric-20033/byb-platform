// src/components/admin/settings/settingsQuery.ts
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompanySettingsAction } from '@/app/actions/admin/settings';
import { unwrapAction } from '@/lib/unwrapAction';

export const SETTINGS_QUERY_KEY = ['admin', 'settings'] as const;

/** Réglages en vigueur (enregistrés, sinon valeurs de repli du site). */
export function useCompanySettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => unwrapAction(await getCompanySettingsAction()).settings,
  });
}

/** Recharge les réglages après un enregistrement : la source de vérité reste le serveur. */
export function useInvalidateSettings() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
}
