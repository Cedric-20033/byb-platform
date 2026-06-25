// src/app/[locale]/(admin)/dashboard/page.tsx
// Clés fr.json : admin.dashboard.title, admin.dashboard.welcome
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">Tableau de bord</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">Bienvenue dans l'interface d'administration BYB.</p>
      </div>
      <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] p-16 text-center text-[var(--color-muted)]">
        <p className="font-[var(--font-display)] font-bold text-lg">Dashboard — Phase 3</p>
        <p className="text-sm mt-2">Les modules de gestion seront implémentés dans la phase suivante.</p>
      </div>
    </div>
  );
}