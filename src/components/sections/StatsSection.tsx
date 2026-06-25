// src/components/sections/StatsSection.tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Trophy, HardHat, Users, Star } from 'lucide-react';
import { t } from '@/lib/utils';
import type { Stat } from '@/types';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = { Trophy, HardHat, Users, Star };

/** Anime un nombre de 0 à `target` en `duration` ms, ease-out cubique. */
function useCountUp(target: number, duration: number, active: boolean): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return count;
}

function StatItem({ stat, active }: { stat: Stat; active: boolean }) {
  const locale = useLocale();
  const Icon   = ICONS[stat.icon] ?? Trophy;
  const count  = useCountUp(stat.value, 2000, active);

  return (
    <div className="flex flex-col items-center text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
        <Icon size={24} className="text-[var(--color-secondary)]" />
      </div>
      <div className="font-[var(--font-display)] font-black text-5xl text-white">
        {count}{stat.suffix}
      </div>
      <p className="text-white/70 text-sm font-medium">{t(stat.label, locale)}</p>
    </div>
  );
}

interface StatsSectionProps {
  /** Stats passées depuis le Server Component parent.
   *  Architecture hexagonale : ce composant ne sait pas d'où viennent les données.
   *  Aujourd'hui : src/data/stats.ts — Phase 3 : Supabase via repository.
   */
  stats: Stat[];
}

export function StatsSection({ stats }: StatsSectionProps) {
  // Clé fr.json : home.stats.eyebrow
  const tSection   = useTranslations('home.stats');
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="section-padding bg-[var(--color-primary)]"
      style={{ clipPath: 'polygon(0 5%, 100% 0, 100% 95%, 0 100%)' }}>
      <div className="container-custom py-8">
        <p className="eyebrow text-white/60 text-center mb-12">{tSection('eyebrow')}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          {stats.map((stat) => (
            <StatItem key={stat.id} stat={stat} active={visible} />
          ))}
        </div>
      </div>
    </section>
  );
}