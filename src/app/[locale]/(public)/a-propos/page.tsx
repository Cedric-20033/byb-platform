// src/app/[locale]/(public)/a-propos/page.tsx
import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import { Shield, Clock, FileText, Users } from 'lucide-react';
import { t } from '@/lib/utils';
// Architecture hexagonale : imports data/ uniquement dans les Server Components (pages)
import { timeline } from '@/data/timeline';
import { stats } from '@/data/stats';
import { company } from '@/data/company';
import { StatsSection } from '@/components/sections/StatsSection';
import { CtaSection } from '@/components/sections/HomesSection';
import { buildLocaleAlternates } from '@/lib/seo/alternates';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // Clés fr.json : about.pageTitle, about.pageDescription
  const tPage = await getTranslations({ locale, namespace: 'about' });
  return {
    title: tPage('pageTitle'),
    description: tPage('pageDescription'),
    alternates: buildLocaleAlternates('/a-propos', locale),
  };
}

export default async function AboutPage() {
  const locale = await getLocale();
  // Clés fr.json : about.history.*, about.values.*, about.team.*
  const tPage  = await getTranslations('about');

  const values = [
    { icon: Shield,   titleKey: 'value1Title', descKey: 'value1Desc' },
    { icon: Clock,    titleKey: 'value2Title', descKey: 'value2Desc' },
    { icon: FileText, titleKey: 'value3Title', descKey: 'value3Desc' },
    { icon: Users,    titleKey: 'value4Title', descKey: 'value4Desc' },
  ] as const;

  return (
    <>
      {/* Hero */}
      <section className="section-padding bg-[var(--color-primary)] text-white diagonal-bottom">
        <div className="container-custom text-center pb-8">
          <p className="eyebrow text-white/60 mb-4">{tPage('history.eyebrow')}</p>
          <h1 className="text-5xl lg:text-6xl font-[var(--font-display)] font-black">{tPage('pageTitle')}</h1>
        </div>
      </section>

      {/* Histoire + timeline */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto mb-16 text-center">
            <p className="eyebrow mb-3">{tPage('history.eyebrow')}</p>
            <h2 className="text-4xl font-[var(--font-display)] font-black mb-5">{tPage('history.title')}</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">{t(company.description, locale)}</p>
          </div>

          {/* Timeline verticale */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-[var(--color-border)] hidden sm:block" />
            <div className="space-y-10">
              {timeline.map((event) => (
                <div key={event.id} className="flex gap-6 sm:pl-16 relative">
                  <div className="hidden sm:flex absolute left-0 w-12 h-12 rounded-full bg-[var(--color-primary)] text-white items-center justify-center font-[var(--font-display)] font-black text-xs shrink-0 shadow-[var(--shadow-md)]">
                    {String(event.year).slice(2)}
                  </div>
                  <div className="flex-1 p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-[var(--font-display)] font-black text-[var(--color-primary)]">{event.year}</span>
                      <h3 className="font-[var(--font-display)] font-bold text-lg">{t(event.title, locale)}</h3>
                    </div>
                    <p className="text-sm text-[var(--color-muted)] leading-relaxed">{t(event.description, locale)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats — données passées en props */}
      <StatsSection stats={stats} />

      {/* Valeurs */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-14">
            <p className="eyebrow mb-3">{tPage('values.eyebrow')}</p>
            <h2 className="text-4xl font-[var(--font-display)] font-black">{tPage('values.title')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, titleKey, descKey }) => (
              <div key={titleKey} className="text-center p-6 rounded-[var(--radius-xl)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-colors">
                <div className="w-12 h-12 mx-auto mb-4 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Icon size={22} className="text-[var(--color-primary)]" />
                </div>
                <h3 className="font-[var(--font-display)] font-bold text-xl mb-2">{tPage(`values.${titleKey}`)}</h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">{tPage(`values.${descKey}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}