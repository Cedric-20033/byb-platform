// src/data/stats.ts
import type { Stat } from '@/types';

export const stats: Stat[] = [
  {
    id: 'stat-001',
    value: 20,
    suffix: '+',
    label: { fr: "Ans d'expérience", en: 'Years of experience', de: 'Jahre Erfahrung' },
    icon: 'Trophy',
  },
  {
    id: 'stat-002',
    value: 850,
    suffix: '+',
    label: { fr: 'Chantiers réalisés', en: 'Projects completed', de: 'Abgeschlossene Projekte' },
    icon: 'HardHat',
  },
  {
    id: 'stat-003',
    value: 15,
    suffix: '',
    label: { fr: 'Artisans qualifiés', en: 'Qualified craftsmen', de: 'Qualifizierte Handwerker' },
    icon: 'Users',
  },
  {
    id: 'stat-004',
    value: 98,
    suffix: '%',
    label: { fr: 'Clients satisfaits', en: 'Satisfied customers', de: 'Zufriedene Kunden' },
    icon: 'Star',
  },
];