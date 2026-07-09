// src/components/providers/QueryProvider.tsx
'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
