// src/components/providers/QueryProvider.tsx
'use client';

import { useState } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { buildLoginRedirectUrl } from '@/lib/auth/sessionExpiry';
import { ActionError } from '@/lib/errors';

/**
 * Session expirée pendant l'usage du dashboard : plutôt que de laisser chaque
 * écran afficher une erreur, on renvoie vers la connexion en mémorisant la page
 * courante. Couvre les requêtes et mutations qui lèvent une `ActionError`.
 */
function redirectOnExpiredSession(error: unknown): void {
  if (!(error instanceof ActionError) || error.code !== 'UNAUTHENTICATED') return;
  window.location.assign(buildLoginRedirectUrl(window.location.pathname, window.location.search));
}

/**
 * Instancie le QueryClient dans un useState (pas un module-level singleton) :
 * en Server-Side Rendering, un singleton partagé entre requêtes ferait fuiter
 * le cache d'un utilisateur vers un autre. Chaque rendu du provider obtient
 * son propre client, recréé uniquement si le composant est démonté/remonté.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: redirectOnExpiredSession }),
        mutationCache: new MutationCache({ onError: redirectOnExpiredSession }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
