// src/app/[locale]/layout.tsx
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/lib/routing';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Navbar } from '@/components/layout/NavBar';
import { Footer } from '@/components/layout/Footer';
import { FloatingCTA } from '@/components/layout/Floatingcta';
import { getActiveServices } from '@/data/services';
import '@/app/[locale]/globals.css';

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RootLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: { template: '%s | BYB Bâtiment & Rénovation', default: 'BYB Bâtiment & Rénovation' },
    description: 'Votre spécialiste en toiture, rénovation et construction depuis 2005.',
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://byb-batiment.fr'),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'fr' | 'en' | 'de')) notFound();

  const messages = await getMessages();

  // Layout = Server Component : seul endroit autorisé à lire src/data/
  // directement. Le bouton flottant (Client Component) reçoit la liste en prop.
  const services = getActiveServices();

  return (
    /*
      suppressHydrationWarning est obligatoire ici.
      ThemeProvider ajoute/retire la classe 'dark' sur <html> côté client
      après l'hydratation, ce qui crée une différence entre le HTML serveur
      et le DOM client. Sans cet attribut, React génère un warning d'hydratation.
    */
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Navbar />
            <main className="pt-16 lg:pt-20">{children}</main>
            <Footer />
            <FloatingCTA services={services} />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
