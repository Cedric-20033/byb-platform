// src/data/services.ts
import type { Service } from '@/types';

/**
 * Catalogue des services proposés par BYB Construction.
 * Structure prête pour la migration Supabase :
 *   - les champs i18n (name, shortDescription, fullDescription) correspondent
 *     aux colonnes JSONB de la table `services`
 *   - les slugs servent d'identifiants d'URL (/services/[slug])
 *   - les images pointent vers /public/images/services/
 *
 * Source : carte de visite + informations transmises par le client.
 * Les textes "fullDescription" sont des rédactions provisoires à valider
 * avec le client — seuls les intitulés de métiers sont des données confirmées.
 */
export const services: Service[] = [
  {
    id: 'svc-001',
    slug: 'toiture',
    name: {
      fr: 'Toiture',
      en: 'Roofing',
      de: 'Dachdeckerarbeiten',
    },
    shortDescription: {
      fr: 'Pose, rénovation et entretien de tous types de toitures.',
      en: 'Installation, renovation and maintenance of all types of roofs.',
      de: 'Verlegung, Renovierung und Wartung aller Dacharten.',
    },
    fullDescription: {
      fr: "Notre équipe intervient sur tous types de toitures : tuiles, ardoises, zinc, membranes EPDM. Nous réalisons la pose de toitures neuves, la rénovation complète ou partielle, ainsi que l'entretien régulier pour prolonger la durée de vie de votre couverture.",
      en: 'Our team works on all types of roofs: tiles, slates, zinc, EPDM membranes.',
      de: 'Unser Team arbeitet an allen Arten von Dächern: Ziegel, Schiefer, Zink, EPDM-Membranen.',
    },
    icon: 'Home',
    coverImage: '/Images/services/toiture-cover.jpeg',
    galleryImages: [
      '/Images/services/toiture-1.webp',
      '/Images/services/toiture-2.jpg',
      '/Images/services/toiture-3.jpg',
    ],
    isActive: true,
    order: 1,
    subServices: [
      {
        id: 'sub-001',
        slug: 'toiture-pentue',
        name: { fr: 'Toiture pentue', en: 'Pitched roof', de: 'Satteldach' },
        description: {
          fr: 'Toiture en tuiles, ardoises ou zinc pour maisons individuelles.',
          en: 'Tile, slate or zinc roofing for individual houses.',
          de: 'Ziegel-, Schiefer- oder Zinkdach für Einfamilienhäuser.',
        },
      },
      {
        id: 'sub-002',
        slug: 'toiture-plate',
        name: { fr: 'Toiture plate', en: 'Flat roof', de: 'Flachdach' },
        description: {
          fr: 'Toiture plate avec membrane EPDM, bitume ou PVC.',
          en: 'Flat roof with EPDM, bitumen or PVC membrane.',
          de: 'Flachdach mit EPDM-, Bitumen- oder PVC-Membran.',
        },
      },
    ],
  },

  {
    id: 'svc-002',
    slug: 'charpente',
    name: {
      fr: 'Charpente',
      en: 'Roof framing',
      de: 'Dachstuhl',
    },
    shortDescription: {
      fr: 'Conception, fabrication et pose de charpentes traditionnelles et industrielles.',
      en: 'Design, manufacturing and installation of traditional and industrial roof framing.',
      de: 'Planung, Herstellung und Montage von traditionellen und industriellen Dachstühlen.',
    },
    fullDescription: {
      fr: 'Nous concevons et posons des charpentes en bois adaptées à tous types de constructions, qu’il s’agisse d’une création neuve, d’un remplacement ou d’un renforcement de structure existante. Chaque charpente est dimensionnée selon les contraintes du bâtiment et les normes en vigueur.',
      en: 'We design and install wooden roof frames adapted to all types of buildings.',
      de: 'Wir planen und montieren Holzdachstühle, die für alle Gebäudetypen geeignet sind.',
    },
    icon: 'Triangle',
    coverImage: '/Images/services/charpente-cover.jpg',
    galleryImages: [
      '/Images/services/charpente-1.jpg',
      '/Images/services/charpente-2.jpg',
      '/Images/services/charpente-3.webp',
      '/Images/services/charpente-4.jpg'
    ],
    isActive: true,
    order: 2,
    subServices: [],
  },

  {
    id: 'svc-003',
    slug: 'bardage',
    name: {
      fr: 'Bardage',
      en: 'Cladding',
      de: 'Verkleidung',
    },
    shortDescription: {
      fr: 'Habillage et protection des façades par bardage bois, métal ou composite.',
      en: 'Facade cladding and protection in wood, metal or composite materials.',
      de: 'Fassadenverkleidung und -schutz aus Holz, Metall oder Verbundwerkstoff.',
    },
    fullDescription: {
      fr: 'Le bardage protège votre façade des intempéries tout en lui donnant un nouveau cachet esthétique. Nous posons des bardages bois, métalliques ou composites, adaptés à votre style architectural et à vos contraintes d’isolation.',
      en: 'Cladding protects your facade from the weather while giving it a fresh look.',
      de: 'Die Verkleidung schützt Ihre Fassade vor Witterungseinflüssen und verleiht ihr ein neues Erscheinungsbild.',
    },
    icon: 'PanelsTopLeft',
    coverImage: '/Images/services/bardage-cover.jpg',
    galleryImages: [
      '/Images/services/bardage-1.jpg',
      '/Images/services/bardage-2.jpg'
    ],
    isActive: true,
    order: 3,
    subServices: [],
  },

  {
    id: 'svc-004',
    slug: 'epdm',
    name: {
      fr: 'EPDM',
      en: 'EPDM roofing',
      de: 'EPDM-Dach',
    },
    shortDescription: {
      fr: 'Pose de membranes EPDM pour toitures plates, étanches et durables.',
      en: 'Installation of EPDM membranes for flat, waterproof and durable roofs.',
      de: 'Verlegung von EPDM-Membranen für dichte und langlebige Flachdächer.',
    },
    fullDescription: {
      fr: "L'EPDM est une membrane en caoutchouc synthétique reconnue pour sa durabilité et son étanchéité. Idéale pour les toitures plates, elle résiste aux UV, aux intempéries et nécessite très peu d'entretien sur le long terme.",
      en: 'EPDM is a synthetic rubber membrane known for its durability and waterproofing.',
      de: 'EPDM ist eine Synthesekautschuk-Membran, die für ihre Langlebigkeit und Dichtheit bekannt ist.',
    },
    icon: 'Layers',
    coverImage: '/Images/services/epdm-cover.webp',
    galleryImages: [
      '/Images/services/epdm-1.jpg',
      '/Images/services/epdm-2.jpg',
      '/Images/services/epdm-3.jpg'
    ],
    isActive: true,
    order: 4,
    subServices: [],
  },

  {
    id: 'svc-005',
    slug: 'facade',
    name: {
      fr: 'Façade',
      en: 'Facade',
      de: 'Fassade',
    },
    shortDescription: {
      fr: 'Ravalement et rénovation de façades pour protéger et embellir votre bâtiment.',
      en: 'Facade renovation to protect and enhance your building.',
      de: 'Fassadensanierung zum Schutz und zur Verschönerung Ihres Gebäudes.',
    },
    fullDescription: {
      fr: 'Le ravalement de façade redonne vie à votre bâtiment tout en le protégeant des infiltrations et de l’usure du temps. Nous intervenons sur les enduits, les peintures extérieures et les traitements d’étanchéité.',
      en: 'Facade renovation revives your building while protecting it from water infiltration and ageing.',
      de: 'Die Fassadensanierung verleiht Ihrem Gebäude neuen Glanz und schützt es vor Feuchtigkeit und Alterung.',
    },
    icon: 'Building',
    coverImage: '/Images/services/facade-cover.jpg',
    galleryImages: [
      '/Images/services/facade-1.jpg',
      '/Images/services/facade-2.jpg',
      '/Images/services/facade-3.jpg'
    ],
    isActive: true,
    order: 5,
    subServices: [],
  },

  {
    id: 'svc-006',
    slug: 'plafonnage',
    name: {
      fr: 'Plafonnage',
      en: 'Plastering',
      de: 'Verputzarbeiten',
    },
    shortDescription: {
      fr: 'Plafonnage intérieur pour des murs et plafonds parfaitement lisses.',
      en: 'Interior plastering for perfectly smooth walls and ceilings.',
      de: 'Innenverputz für perfekt glatte Wände und Decken.',
    },
    fullDescription: {
      fr: "Le plafonnage prépare vos murs et plafonds avant peinture ou décoration. Nous réalisons des finitions soignées, garantissant des surfaces lisses et uniformes, que ce soit en construction neuve ou en rénovation.",
      en: 'Plastering prepares your walls and ceilings before painting or decoration.',
      de: 'Der Verputz bereitet Ihre Wände und Decken vor dem Anstreichen oder Dekorieren vor.',
    },
    icon: 'Paintbrush',
    coverImage: '/Images/services/plafonnage-cover.jpeg',
    galleryImages: [
      '/Images/services/plafonnage-1.jpg',
      '/Images/services/plafonnage-2.jpg',
      '/Images/services/plafonnage-3.jpg',
      '/Images/services/plafonnage-4.jpg'
    ],
    isActive: true,
    order: 6,
    subServices: [],
  },

  {
    id: 'svc-007',
    slug: 'carrelage',
    name: {
      fr: 'Carrelage',
      en: 'Tiling',
      de: 'Fliesenarbeiten',
    },
    shortDescription: {
      fr: 'Pose de carrelage intérieur et extérieur, pour sols et murs.',
      en: 'Indoor and outdoor floor and wall tiling.',
      de: 'Verlegung von Innen- und Außenfliesen für Boden und Wand.',
    },
    fullDescription: {
      fr: "Nous posons tous types de carrelage — grès cérame, faïence, pierre naturelle — pour vos sols et murs, intérieurs comme extérieurs. Une attention particulière est portée à la préparation du support pour un résultat durable.",
      en: 'We install all types of tiling — porcelain stoneware, ceramic, natural stone — for floors and walls.',
      de: 'Wir verlegen alle Arten von Fliesen — Feinsteinzeug, Keramik, Naturstein — für Böden und Wände.',
    },
    icon: 'Grid3x3',
    coverImage: '/Images/services/carrelage-cover.jpg',
    galleryImages: [
      '/Images/services/carrelage-3.jpg',
      '/Images/services/carrelage-1.jpg',
      '/Images/services/carrelage-2.jpg'
    ],
    isActive: true,
    order: 7,
    subServices: [],
  },

  {
    id: 'svc-008',
    slug: 'panneaux-solaires',
    name: {
      fr: 'Panneaux solaires',
      en: 'Solar panels',
      de: 'Solarpaneele',
    },
    shortDescription: {
      fr: 'Installation de panneaux photovoltaïques pour réduire votre facture énergétique.',
      en: 'Installation of photovoltaic panels to reduce your energy bill.',
      de: 'Installation von Photovoltaikanlagen zur Senkung Ihrer Energiekosten.',
    },
    fullDescription: {
      fr: "Nous installons des panneaux solaires photovoltaïques adaptés à votre toiture et à votre consommation. Une solution durable pour produire votre propre électricité et réduire votre dépendance énergétique.",
      en: 'We install photovoltaic solar panels adapted to your roof and your energy consumption.',
      de: 'Wir installieren Photovoltaikanlagen, die auf Ihr Dach und Ihren Energieverbrauch abgestimmt sind.',
    },
    icon: 'Sun',
    coverImage: '/Images/services/panneaux-solaires-cover.jpg',
    galleryImages: [
      '/Images/services/panneaux-solaires-1.jpg',
      '/Images/services/panneaux-solaires-2.jpg',
      '/Images/services/panneaux-solaires-3.jpg',
      '/Images/services/panneaux-solaires-4.avif',
      '/Images/services/panneaux-solaires-5.jpg',
      '/Images/services/panneaux-solaires-6.jpg'
    ],
    isActive: true,
    order: 8,
    subServices: [],
  },

  {
    id: 'svc-009',
    slug: 'chauffage-sanitaire',
    name: {
      fr: 'Chauffage sanitaire',
      en: 'Heating & sanitary',
      de: 'Heizung & Sanitär',
    },
    shortDescription: {
      fr: 'Installation et entretien de systèmes de chauffage et sanitaires.',
      en: 'Installation and maintenance of heating and sanitary systems.',
      de: 'Installation und Wartung von Heizungs- und Sanitäranlagen.',
    },
    fullDescription: {
      fr: "Nous installons et entretenons vos équipements de chauffage et sanitaires : chaudières, radiateurs, sanitaires, robinetterie. Notre objectif est de garantir confort et fiabilité au quotidien.",
      en: 'We install and maintain heating and sanitary equipment: boilers, radiators, fixtures, plumbing.',
      de: 'Wir installieren und warten Heizungs- und Sanitäranlagen: Kessel, Heizkörper, Sanitäranlagen, Armaturen.',
    },
    icon: 'Flame',
    coverImage: '/Images/services/chauffage-sanitaire-cover.jpg',
    galleryImages: [],
    isActive: true,
    order: 9,
    subServices: [],
  },

  {
    id: 'svc-010',
    slug: 'maconnerie',
    name: {
      fr: 'Maçonnerie',
      en: 'Masonry',
      de: 'Maurerarbeiten',
    },
    shortDescription: {
      fr: 'Travaux de gros œuvre : fondations, murs, dalles et structures en béton.',
      en: 'Structural masonry work: foundations, walls, slabs and concrete structures.',
      de: 'Rohbauarbeiten: Fundamente, Wände, Platten und Betonstrukturen.',
    },
    fullDescription: {
      fr: "Nous réalisons l'ensemble des travaux de maçonnerie : fondations, élévation de murs, dalles, ouvertures. Un savoir-faire solide pour garantir la stabilité et la durabilité de votre construction.",
      en: 'We carry out all masonry work: foundations, wall construction, slabs, openings.',
      de: 'Wir führen alle Maurerarbeiten durch: Fundamente, Wandbau, Platten, Öffnungen.',
    },
    icon: 'Bricks',
    coverImage: '/Images/services/maconnerie-cover.jpg',
    galleryImages: [
      '/Images/services/maconnerie-1.jpg',
      '/Images/services/maconnerie-2.jpg',
      '/Images/services/maconnerie-3.jpg'
    ],
    isActive: true,
    order: 10,
    subServices: [],
  },
];

/**
 * Retourne un service par son slug.
 * Utile pour les pages dynamiques /services/[slug].
 */
export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

/**
 * Retourne uniquement les services actifs, triés par ordre.
 */
export function getActiveServices(): Service[] {
  return services.filter((s) => s.isActive).sort((a, b) => a.order - b.order);
}