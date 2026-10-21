// src/components/layout/PublicChrome.tsx
import { getTranslations } from 'next-intl/server';
import { Navbar } from './NavBar';
import { Footer } from './Footer';
import { FloatingCTA } from './Floatingcta';
import { FloatingWhatsApp } from './FloatingWhatsApp';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceRepository';
import { loadPublicCompanyInfo } from '@/lib/settings/publicCompanyInfo';

/**
 * Chrome visuel des pages publiques (navbar, footer, CTA flottant).
 *
 * Monté une seule fois, par (public)/layout.tsx : toute page du groupe public (accueil,
 * services, réalisations, à propos, contact, mentions légales, réservation, et la 404
 * qui y est rattachée) hérite donc du CTA flottant, et le dashboard ou le login n'y
 * ont jamais accès.
 */
export async function PublicChrome({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const services = await new SupabaseServiceRepository(supabase).findAll({ activeOnly: true });
  // Coordonnées et numéro WhatsApp : réglages de l'entreprise (jamais l'email de notification interne).
  const companyInfo = await loadPublicCompanyInfo();
  const tA11y = await getTranslations('a11y');

  return (
    <>
      {/* Lien d'évitement (WCAG 2.4.1) : invisible jusqu'au focus clavier, il évite de retraverser tout le menu. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-md)] focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {tA11y('skipToContent')}
      </a>
      <Navbar services={services} />
      <main id="main-content" tabIndex={-1} className="pt-16 lg:pt-20 focus:outline-none">
        {children}
      </main>
      <Footer info={companyInfo} />
      <FloatingWhatsApp phoneNumber={companyInfo.contact.whatsapp} />
      <FloatingCTA services={services} />
    </>
  );
}
