// src/app/[locale]/(admin)/layout.tsx

/**
 * Layout protégé admin.
 *
 * Architecture hexagonale :
 *   Phase 3 — remplacer le commentaire par la vérification JWT Supabase.
 *   Le middleware fait une vérification légère (cookie présent).
 *   Ce layout fait la vérification complète côté serveur.
 *
 * TODO Phase 3 :
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   if (!user) redirect('/login');
 *   const { data: profile } = await supabase.from('profiles').select('role, permissions').eq('id', user.id).single();
 *   if (!profile || !['admin','superadmin'].includes(profile.role)) redirect('/');
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <aside className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] p-6">
        <p className="font-[var(--font-display)] font-bold text-lg text-[var(--color-primary)]">BYB Admin</p>
        <p className="text-xs text-[var(--color-muted)] mt-1">Phase 3 — à compléter</p>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}