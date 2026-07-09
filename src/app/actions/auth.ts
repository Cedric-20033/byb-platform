'use server';

// src/app/actions/auth.ts
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { getLocalizedPath, type Locale } from '@/lib/routing';

const signInSchema = z.object({
  email: z.email({ error: 'Adresse email invalide.' }),
  password: z.string().min(1, { error: 'Le mot de passe est requis.' }),
});

type SignInResult = { success: true } | { success: false; error: string };

/**
 * Connexion admin. La vérification du rôle (admin/superadmin) se fait
 * ensuite par (admin)/layout.tsx via getCurrentAdmin() — cette action ne
 * fait qu'authentifier l'identité Supabase, pas l'autorisation métier.
 */
export async function signInAction(input: unknown): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, error: 'Email ou mot de passe incorrect.' };
  }

  return { success: true };
}

export async function signOutAction(locale: Locale): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(getLocalizedPath('/login', locale));
}
