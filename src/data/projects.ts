// src/data/projects.ts
import type { Project } from '@/types';

/**
 * Galerie des réalisations de l'entreprise.
 * La propriété `category` correspond au slug d'un service (src/data/services.ts).
 * Cela permet le filtrage par catégorie sur la page /realisations.
 */
export const projects: Project[] = [
  {
    id: 'prj-001',
    title: { fr: 'Réfection toiture — Maison individuelle', en: 'Roof renovation — Detached house' },
    description: { fr: 'Remplacement complet de la couverture en tuiles canal. Isolation des combles incluse.' },
    image: '/images/projects/toiture-maison-1.jpg',
    category: 'toiture',
    date: '2024-10-01',
    isHighlighted: true,
  },
  {
    id: 'prj-002',
    title: { fr: 'Toiture plate — Immeuble commercial', en: 'Flat roof — Commercial building' },
    description: { fr: 'Pose d\'une membrane EPDM sur 450 m² avec relevés d\'étanchéité complets.' },
    image: '/Images/projects/toiture-plate-1.jpg',
    category: 'toiture',
    date: '2024-09-15',
    isHighlighted: true,
  },
  {
    id: 'prj-003',
    title: { fr: 'Rénovation salle de bain complète', en: 'Full bathroom renovation' },
    description: { fr: 'Transformation complète : carrelage, plomberie, douche à l\'italienne, meuble suspendu.' },
    image: '/Images/projects/renovation-sdb-1.jpg',
    category: 'renovation',
    date: '2024-08-20',
    isHighlighted: true,
  },
  {
    id: 'prj-004',
    title: { fr: 'Ravalement de façade', en: 'Facade renovation' },
    description: { fr: 'Ravalement complet avec isolation thermique par l\'extérieur (ITE) — gain énergétique de classe D à B.' },
    image: '/Images/projects/renovation-facade-1.jpg',
    category: 'renovation',
    date: '2024-07-10',
    isHighlighted: false,
  },
  {
    id: 'prj-005',
    title: { fr: 'Construction maison neuve — Gros œuvre', en: 'New house construction — Structural work' },
    description: { fr: 'Dalle de fondation, murs en parpaing, chape béton. Surface : 120 m².' },
    image: '/Images/projects/construction-1.jpg',
    category: 'construction-neuve',
    date: '2024-06-01',
    isHighlighted: false,
  },
  {
    id: 'prj-006',
    title: { fr: 'Isolation combles perdus — Maison des années 70', en: 'Lost attic insulation — 1970s house' },
    description: { fr: 'Soufflage de 180 m² de ouate de cellulose. Éligible MaPrimeRénov\'. Gain de 40% sur la facture de chauffage.' },
    image: '/Images/projects/isolation-combles-1.jpg',
    category: 'isolation',
    date: '2024-05-15',
    isHighlighted: true,
  },
];

/**
 * Retourne les projets mis en avant pour la page d'accueil.
 */
export function getHighlightedProjects(): Project[] {
  return projects.filter((p) => p.isHighlighted);
}

/**
 * Retourne les projets filtrés par catégorie (slug de service).
 */
export function getProjectsByCategory(category: string): Project[] {
  return projects.filter((p) => p.category === category);
}