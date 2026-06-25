// src/components/sections/HeroSection.tsx

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getLocalizedPath, Locale } from '@/lib/routing';

/**
 * Section hero de la page d'accueil.
 * Clés fr.json utilisées : home.hero.*
 */
export function HeroSection() {
  // Clés : home.hero.tagline, home.hero.title, home.hero.subtitle,
  //        home.hero.ctaPrimary, home.hero.ctaSecondary
  const t = useTranslations('home.hero');
  const locale = useLocale() as Locale;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Image de fond + overlay */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/90 via-[var(--color-primary)]/70 to-[var(--color-foreground)]/80" />
      </div>

      {/* Motif toits en arrière-plan */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="roof" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 40 L30 10 L60 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#roof)" />
        </svg>
      </div>

      <div className="relative z-10 container-custom text-center text-white py-32">
        <p className="eyebrow text-white/70 mb-6">{t('tagline')}</p>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-[var(--font-display)] font-black leading-none mb-6">
          {t('title')}
        </h1>

        <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={getLocalizedPath('/services', locale)}>
            <Button variant="secondary" size="lg">
              {t('ctaPrimary')} <ArrowRight size={18} />
            </Button>
          </Link>
          <Link href={getLocalizedPath('/realisations', locale)}>
            <Button variant="outline" size="lg"
              className="border-white/60 text-white hover:bg-white hover:text-[var(--color-primary)]">
              {t('ctaSecondary')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 animate-bounce">
        <ChevronDown size={24} />
      </div>

      {/* Découpe diagonale */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-[var(--color-background)]"
        style={{ clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }} />
    </section>
  );
}