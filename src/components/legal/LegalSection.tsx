// src/components/legal/LegalSection.tsx
import type { ReactNode } from 'react';

/** Bloc titré des pages juridiques : mentions légales et politique de confidentialité partagent la même mise en page. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-[var(--font-display)] font-bold text-lg text-[var(--color-foreground)]">{title}</h2>
      {children}
    </section>
  );
}

/** Conteneur commun : largeur de lecture confortable et texte secondaire. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="section-padding">
      <div className="container-custom max-w-3xl">
        <h1 className="text-4xl font-[var(--font-display)] font-black mb-10">{title}</h1>
        <div className="space-y-8 text-[var(--color-muted)] text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
