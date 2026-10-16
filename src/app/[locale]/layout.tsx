// src/app/[locale]/layout.tsx
import type { Metadata } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/lib/routing';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Toaster } from 'sonner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import '@/app/[locale]/globals.css';

/**
 * Polices hébergées par le site lui-même. `next/font/google` télécharge les fichiers à la compilation et les sert depuis
 * le domaine du site : le navigateur du visiteur ne contacte jamais Google. Charger ces polices depuis
 * fonts.googleapis.com (ce que faisait `globals.css`) transmet l'adresse IP de chaque visiteur à Google sans son
 * accord, ce que le RGPD ne permet pas sans consentement.
 * Les variables CSS alimentent `--font-display` et `--font-body` dans globals.css.
 */
const fontDisplay = Barlow_Condensed({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-barlow-condensed',
});

const fontBody = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
});

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RootLayoutProps): Promise<Metadata> {
  await params;
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

  return (
    /*
      suppressHydrationWarning est obligatoire ici.
      ThemeProvider ajoute/retire la classe 'dark' sur <html> côté client
      après l'hydratation, ce qui crée une différence entre le HTML serveur
      et le DOM client. Sans cet attribut, React génère un warning d'hydratation.
    */
    <html lang={locale} className={`${fontDisplay.variable} ${fontBody.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ProgressBar />
            {children}
            {/* position="top-right" : cohérent avec la cloche de notifications
                du dashboard admin, qui vit au même endroit de l'écran. */}
            <Toaster position="top-right" richColors closeButton />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
