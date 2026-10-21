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
      en: "Excellent work on the complete renovation of our roof. The team is reliable, punctual and the site was clean every evening. I highly recommend BYB for the quality of their work and their customer care.",
      de: "Hervorragende Arbeit bei der kompletten Sanierung unseres Dachs. Das Team ist zuverlässig, pünktlich und die Baustelle war jeden Abend sauber. Ich empfehle BYB uneingeschränkt wegen der Qualität der Arbeit und des Kundenservice.",
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
      en: "BYB renovated our bathroom and kitchen in just 3 weeks. The quote was respected, the work was neat and the craftsmen listened to us. A great experience from start to finish.",
      de: "BYB hat unser Bad und unsere Küche in nur 3 Wochen renoviert. Das Angebot wurde eingehalten, die Arbeit war sorgfältig und die Handwerker haben uns zugehört. Eine tolle Erfahrung von Anfang bis Ende.",
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
      en: "Attic insulation done quickly and cleanly. We have already noticed a difference on our heating bill. Very satisfied with the value for money.",
      de: "Die Dachbodendämmung wurde schnell und sauber ausgeführt. Wir haben bereits einen Unterschied bei der Heizkostenabrechnung bemerkt. Sehr zufrieden mit dem Preis-Leistungs-Verhältnis.",
    },
    rating: 4,
    date: '2024-07-20',
  },
];
