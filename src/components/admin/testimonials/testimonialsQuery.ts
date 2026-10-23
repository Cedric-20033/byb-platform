// src/components/admin/testimonials/testimonialsQuery.ts
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listTestimonialsAction } from '@/app/actions/admin/testimonials';
import { unwrapAction } from '@/lib/unwrapAction';

export const TESTIMONIALS_QUERY_KEY = ['admin', 'testimonials'] as const;

/** Tous les témoignages (brouillons compris), partagés par la liste et la fiche d'un témoignage. */
export function useTestimonials() {
  return useQuery({
    queryKey: TESTIMONIALS_QUERY_KEY,
    queryFn: async () => unwrapAction(await listTestimonialsAction()).testimonials,
  });
}

/** Recharge les témoignages après une mutation : la source de vérité reste le serveur. */
export function useInvalidateTestimonials() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: TESTIMONIALS_QUERY_KEY });
}
