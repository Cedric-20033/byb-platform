// src/components/layout/PublicChrome.tsx
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

  return (
    <>
      <Navbar services={services} />
      <main className="pt-16 lg:pt-20">{children}</main>
      <Footer info={companyInfo} />
      <FloatingWhatsApp phoneNumber={companyInfo.contact.whatsapp} />
      <FloatingCTA services={services} />
    </>
  );
}
