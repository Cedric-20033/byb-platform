// src/data/testimonials.ts
import type { Testimonial } from '@/types';

/**
 * ⚠️ DONNÉES FICTIVES (placeholders de développement).
 * Les noms, lieux et avis ci-dessous ne proviennent pas de vrais clients :
 * ils doivent être REMPLACÉS par de vrais témoignages (avec accord de leurs
 * auteurs) avant la mise en production — publier de faux avis serait une
 * pratique commerciale trompeuse. Voir tâche P6.2 / P11.8 de CLAUDE.md.
 */
export const testimonials: Testimonial[] = [
  {
    id: 'tst-001',
    authorName: 'Marc Lefebvre',
    authorLocation: 'Hasselt',
    content: {
      fr: "Excellent travail sur la réfection complète de notre toiture. L'équipe est sérieuse, ponctuelle et le chantier était propre chaque soir. Je recommande vivement BYB pour la qualité de leur travail et leur sens du contact client.",
    },
    rating: 5,
    date: '2024-10-15',
    avatarImage: undefined,
  },
  {
    id: 'tst-002',
    authorName: 'Sophie Girard',
    authorLocation: 'Tongres',
    content: {
      fr: "BYB a rénové notre salle de bain et notre cuisine en 3 semaines chrono. Respect du devis, travail soigné, artisans à l'écoute. Une belle expérience du début à la fin.",
    },
    rating: 5,
    date: '2024-09-02',
  },
  {
    id: 'tst-003',
    authorName: 'Thierry Moulin',
    authorLocation: 'Liège',
    content: {
      fr: "Isolation des combles réalisée rapidement et proprement. On a déjà constaté une différence sur la facture de chauffage. Très satisfait du rapport qualité-prix.",
    },
    rating: 4,
    date: '2024-07-20',
  },
];
