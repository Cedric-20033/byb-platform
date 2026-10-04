'use server';

// src/app/actions/auth.ts
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

type SignInResult = { success: true } | ActionFailure;

/**
 * Connexion admin. La vérification du rôle (admin/superadmin) se fait
 * ensuite par (admin)/layout.tsx via getCurrentAdmin() — cette action ne
 * fait qu'authentifier l'identité Supabase, pas l'autorisation métier.
 */
export async function signInAction(input: unknown): Promise<SignInResult> {
  try {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return failure('INVALID_CREDENTIALS');
    }

    return { success: true };
  } catch (error) {
    // Ici une erreur inattendue (réseau, Supabase indisponible...), distincte
    // d'un simple mauvais mot de passe (déjà géré ci-dessus sans exception).
    return failure(toErrorCode(error));
  }
}

export async function signOutAction(locale: Locale): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(getLocalizedPath('/login', locale));
}
