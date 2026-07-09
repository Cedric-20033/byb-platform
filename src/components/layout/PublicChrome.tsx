// src/components/layout/PublicChrome.tsx
import { Navbar } from './NavBar';
import { Footer } from './Footer';
import { FloatingCTA } from './Floatingcta';
import { getActiveServices } from '@/data/services';

/**
 * Chrome visuel des pages publiques (navbar, footer, CTA flottant).
 *
 * Utilisé par (public)/layout.tsx pour tout le groupe, et directement par les
 * deux pages qui vivent encore hors de ce groupe (page.tsx racine, mentions-legales)
 * pour qu'elles restent visuellement cohérentes sans dupliquer le balisage.
 */
export function PublicChrome({ children }: { children: React.ReactNode }) {
  const services = getActiveServices();

  return (
    <>
      <Navbar />
      <main className="pt-16 lg:pt-20">{children}</main>
      <Footer />
      <FloatingCTA services={services} />
    </>
  );
}
