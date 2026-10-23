// src/components/auth/AuthLayout.tsx
import { company } from '@/data/company';

/**
 * Cadre commun des écrans d'authentification (connexion, mot de passe oublié,
 * réinitialisation, activation) — volontairement hors des groupes (public)/(admin) :
 * ni navbar/footer publics, ni sidebar admin, juste un écran focalisé.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-[var(--font-display)] font-black text-2xl text-[var(--color-primary)]">
            {company.name}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
