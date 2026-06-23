// src/data/timeline.ts
import type { TimelineEvent } from '@/types';

export const timeline: TimelineEvent[] = [
  {
    id: 'evt-001',
    year: 2005,
    title: { fr: 'Fondation de BYB', en: 'BYB founded', de: 'Gründung von BYB' },
    description: {
      fr: "L'entreprise BYB est fondée avec une équipe de 3 artisans passionnés, spécialisée dans la toiture et la rénovation dans la région lyonnaise.",
      en: 'BYB is founded with a team of 3 passionate craftsmen, specializing in roofing and renovation in the Lyon area.',
      de: 'BYB wird mit einem Team von 3 leidenschaftlichen Handwerkern gegründet, spezialisiert auf Dachdeckerarbeiten und Renovierungen im Lyoner Raum.',
    },
    image: '/images/timeline/2005-fondation.jpg',
  },
  {
    id: 'evt-002',
    year: 2010,
    title: { fr: 'Première expansion', en: 'First expansion', de: 'Erste Expansion' },
    description: {
      fr: "BYB atteint 8 collaborateurs et élargit son offre à la construction neuve et l'isolation thermique.",
      en: 'BYB reaches 8 employees and expands its offer to new construction and thermal insulation.',
      de: 'BYB erreicht 8 Mitarbeiter und erweitert sein Angebot um Neubau und Wärmedämmung.',
    },
  },
  {
    id: 'evt-003',
    year: 2015,
    title: { fr: 'Certification RGE', en: 'RGE Certification', de: 'RGE-Zertifizierung' },
    description: {
      fr: "Obtention de la certification Reconnu Garant de l'Environnement (RGE), permettant aux clients de bénéficier des aides à la rénovation énergétique.",
      en: 'Obtaining the RGE (Recognized Environmental Guarantor) certification, allowing customers to benefit from energy renovation grants.',
      de: 'Erhalt der RGE-Zertifizierung, die es Kunden ermöglicht, Energierenovierungsförderungen zu nutzen.',
    },
    image: '/images/timeline/2015-rge.jpg',
  },
  {
    id: 'evt-004',
    year: 2020,
    title: { fr: '15 ans & 15 artisans', en: '15 years & 15 craftsmen', de: '15 Jahre & 15 Handwerker' },
    description: {
      fr: "BYB célèbre ses 15 ans avec une équipe de 15 artisans qualifiés et plus de 600 chantiers réalisés en Auvergne-Rhône-Alpes.",
      en: 'BYB celebrates its 15th anniversary with a team of 15 qualified craftsmen and over 600 projects completed.',
      de: 'BYB feiert sein 15-jähriges Bestehen mit einem Team von 15 qualifizierten Handwerkern und über 600 abgeschlossenen Projekten.',
    },
  },
  {
    id: 'evt-005',
    year: 2025,
    title: { fr: 'Nouveau site, même engagement', en: 'New website, same commitment', de: 'Neue Website, gleiche Verpflichtung' },
    description: {
      fr: "Fort de 20 ans d'expertise, BYB se modernise et lance son nouveau site pour mieux vous accompagner dans vos projets.",
      en: 'With 20 years of expertise, BYB modernizes and launches its new website to better support you in your projects.',
      de: 'Mit 20 Jahren Erfahrung modernisiert sich BYB und startet eine neue Website.',
    },
  },
];