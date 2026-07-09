import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Client Supabase pour Server Components, Server Actions et Route Handlers.
 *
 * setAll() est nécessaire pour que signInAction/signOutAction (Server Actions)
 * puissent réellement écrire/effacer le cookie de session. Sans lui, l'appel
 * réussit côté Supabase mais aucune session n'est jamais persistée dans le
 * navigateur — le dashboard resterait inaccessible malgré une connexion "OK".
 *
 * Le try/catch existe parce que cookies().set() lève une erreur s'il est
 * appelé pendant le rendu d'un Server Component (lecture seule) ; c'est sans
 * conséquence ici car le middleware rafraîchit déjà la session dans ce cas.
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Appelé depuis un Server Component en lecture seule — sans effet, voir commentaire ci-dessus.
          }
        },
      },
    }
  )
}
