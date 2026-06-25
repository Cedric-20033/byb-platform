// src/components/sections/HomeSections.tsx
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Star, Quote, ArrowRight, CheckCircle2 } from 'lucide-react';
import { t } from '@/lib/utils';
import { company } from '@/data/company';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShowImage } from '../ui/ShowImage';
import type { Testimonial } from '@/types';
import type { HomeAboutData } from '@/data/home';

// ─── Témoignages ──────────────────────────────────────────────────────────────

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const tSection = useTranslations('home.testimonials');
  const locale   = useLocale();

  return (
    <section className="section-padding bg-[var(--color-background)]">
      <div className="container-custom">
        <div className="text-center mb-14">
          <p className="eyebrow mb-3">{tSection('eyebrow')}</p>
          <h2 className="text-4xl lg:text-5xl font-[var(--font-display)] font-black">{tSection('title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <Card key={item.id} className="p-7 flex flex-col gap-5">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} className={i < item.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--color-border)]'} />
                ))}
              </div>
              <div className="relative flex-1">
                <Quote size={28} className="absolute -top-2 -left-1 text-[var(--color-primary)]/15" />
                <p className="text-[var(--color-muted)] text-sm leading-relaxed pl-5">{t(item.content, locale)}</p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-[var(--color-border)]">
                <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center font-[var(--font-display)] font-bold text-[var(--color-primary)] text-sm">
                  {item.authorName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.authorName}</p>
                  <p className="text-xs text-[var(--color-muted)]">{item.authorLocation}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── À propos — extrait page d'accueil ───────────────────────────────────────

export function AboutSnippet({ about }: { about: HomeAboutData }) {
  const tSection = useTranslations('home.about');
  const locale = useLocale();

  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative rounded-[var(--radius-xl)] overflow-hidden aspect-[4/3] bg-[var(--color-surface-raised)] flex items-center justify-center text-[var(--color-muted)] text-sm">
            <ShowImage width={600} height={450} src={about.imageSrc} alt={t(about.imageAlt, locale)} />
            <div className="absolute bottom-5 right-5 bg-[var(--color-secondary)] text-white rounded-[var(--radius-md)] px-4 py-3 text-center shadow-[var(--shadow-lg)]">
              <p className="font-[var(--font-display)] font-black text-3xl">{tSection('experienceNumber')}</p>
              <p className="text-xs font-medium opacity-90">{tSection('experienceLabel')}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="eyebrow mb-3">{tSection('eyebrow')}</p>
              <h2 className="text-4xl lg:text-5xl font-[var(--font-display)] font-black leading-tight">{tSection('title')}</h2>
            </div>
            <p className="text-[var(--color-muted)] leading-relaxed">{tSection('description')}</p>
            <ul className="space-y-3">
              {about.highlights.map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 size={18} className="text-[var(--color-secondary)] shrink-0" />
                  {t(item.label, locale)}
                </li>
              ))}
            </ul>
            <Link href="/a-propos">
              <Button variant="primary">
                En savoir plus <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA final ────────────────────────────────────────────────────────────────

/**
 * CtaSection est un Server Component — il ne peut pas utiliser useLocale().
 * Le lien /contact est statique et ne dépend pas de la locale
 * car next-intl gère le préfixe automatiquement dans <Link>.
 */
export function CtaSection() {
  const tSection = useTranslations('home.cta');

  return (
    <section
      className="section-padding bg-[var(--color-primary)]"
      style={{ clipPath: 'polygon(0 8%, 100% 0, 100% 100%, 0 92%)' }}
    >
      <div className="container-custom text-center text-white py-8">
        <h2 className="text-4xl lg:text-5xl font-[var(--font-display)] font-black mb-4">
          {tSection('title')}
        </h2>
        <p className="text-white/75 text-lg mb-10 max-w-xl mx-auto">
          {tSection('subtitle')}
        </p>
        {/*
          Lien vers /contact — next-intl dans le middleware ajoute automatiquement
          le préfixe de locale (/fr/contact, /en/contact) sans qu'on ait besoin
          de construire l'URL manuellement. Pas besoin de locale ici.
        */}
        <Link href="/contact">
          <Button variant="secondary" size="lg">{tSection('button')}</Button>
        </Link>
      </div>
    </section>
  );
}