// src/data/services.ts
import type { Service } from '@/types';

/**
 * Catalogue des services proposés par BYB.
 * Structure prête pour la migration Supabase :
 *   - les champs i18n (name, shortDescription, fullDescription) correspondent
 *     aux colonnes JSONB de la table `services`
 *   - les slugs servent d'identifiants d'URL (/services/[slug])
 *   - les images pointent vers /public/images/services/
 *
 * À ENRICHIR avec les vraies données client dès réception.
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
      fr: "Notre équipe intervient sur tous types de toitures : tuiles, ardoises, zinc, membranes asphaltiques. Nous réalisons la pose de toitures neuves, la rénovation complète ou partielle, et l'entretien régulier pour prolonger la durée de vie de votre couverture. Chaque chantier est réalisé dans le respect des normes DTU et avec des matériaux certifiés.",
      en: 'Our team works on all types of roofs: tiles, slates, zinc, bituminous membranes.',
      de: 'Unser Team arbeitet an allen Arten von Dächern: Ziegel, Schiefer, Zink, Bitumenmembranen.',
    },
    icon: 'Home',
    coverImage: '/images/services/toiture-cover.jpg',
    galleryImages: [
      '/images/services/toiture-1.jpg',
      '/images/services/toiture-2.jpg',
      '/images/services/toiture-3.jpg',
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
    slug: 'renovation',
    name: {
      fr: 'Rénovation',
      en: 'Renovation',
      de: 'Renovierung',
    },
    shortDescription: {
      fr: 'Rénovation intérieure et extérieure pour particuliers et professionnels.',
      en: 'Interior and exterior renovation for individuals and businesses.',
      de: 'Innen- und Außenrenovierung für Privatpersonen und Unternehmen.',
    },
    fullDescription: {
      fr: "De la rénovation d'une salle de bain à la transformation complète d'un logement, nous prenons en charge l'intégralité de votre projet. Nos artisans qualifiés maîtrisent les techniques traditionnelles et les dernières innovations pour un résultat qui dépasse vos attentes.",
      en: 'From bathroom renovation to complete home transformation, we handle your entire project.',
      de: 'Von der Badsanierung bis zur kompletten Wohnungsumgestaltung übernehmen wir Ihr gesamtes Projekt.',
    },
    icon: 'Hammer',
    coverImage: '/images/services/renovation-cover.jpg',
    galleryImages: [
      '/images/services/renovation-1.jpg',
      '/images/services/renovation-2.jpg',
    ],
    isActive: true,
    order: 2,
    subServices: [
      {
        id: 'sub-003',
        slug: 'renovation-interieure',
        name: { fr: 'Rénovation intérieure', en: 'Interior renovation', de: 'Innenrenovierung' },
        description: {
          fr: 'Plomberie, électricité, cloisons, peinture, revêtements de sol.',
          en: 'Plumbing, electricity, partitions, painting, floor coverings.',
          de: 'Sanitär, Elektro, Trennwände, Malerarbeiten, Bodenbeläge.',
        },
      },
      {
        id: 'sub-004',
        slug: 'renovation-exterieure',
        name: { fr: 'Rénovation extérieure', en: 'Exterior renovation', de: 'Außenrenovierung' },
        description: {
          fr: 'Ravalement de façade, isolation thermique par l'extérieur (ITE), bardage.',
          en: 'Facade renovation, external thermal insulation (ETI), cladding.',
          de: 'Fassadenrenovierung, Außendämmung (WDVS), Verkleidung.',
        },
      },
    ],
  },

  {
    id: 'svc-003',
    slug: 'construction-neuve',
    name: {
      fr: 'Construction neuve',
      en: 'New construction',
      de: 'Neubau',
    },
    shortDescription: {
      fr: 'Gros œuvre et second œuvre pour vos projets de construction neuve.',
      en: 'Structural and finishing work for your new construction projects.',
      de: 'Rohbau und Ausbau für Ihre Neubauprojekte.',
    },
    fullDescription: {
      fr: "Nous accompagnons les maîtres d'ouvrage de la dalle de fondation jusqu'aux finitions. Notre coordination avec les architectes et les bureaux d'études garantit le respect des plans, des délais et du budget.",
      en: 'We support project owners from the foundation slab to the finishes.',
      de: 'Wir begleiten Bauherren von der Fundamentplatte bis zu den Fertigstellungsarbeiten.',
    },
    icon: 'Building2',
    coverImage: '/images/services/construction-cover.jpg',
    galleryImages: [
      '/images/services/construction-1.jpg',
      '/images/services/construction-2.jpg',
    ],
    isActive: true,
    order: 3,
    subServices: [],
  },

  {
    id: 'svc-004',
    slug: 'isolation',
    name: {
      fr: 'Isolation',
      en: 'Insulation',
      de: 'Dämmung',
    },
    shortDescription: {
      fr: 'Isolation thermique et acoustique pour réduire vos factures énergétiques.',
      en: 'Thermal and acoustic insulation to reduce your energy bills.',
      de: 'Wärme- und Schalldämmung zur Reduzierung Ihrer Energiekosten.',
    },
    fullDescription: {
      fr: "L'isolation est un investissement rentable à long terme. Nous réalisons l'isolation des combles, des murs, des planchers et des toitures pour améliorer le confort thermique et acoustique de votre habitat tout en réduisant votre consommation énergétique.",
      en: 'Insulation is a profitable long-term investment. We insulate attics, walls, floors and roofs.',
      de: 'Dämmung ist eine rentable Langzeitinvestition. Wir dämmen Dachböden, Wände, Böden und Dächer.',
    },
    icon: 'Layers',
    coverImage: '/images/services/isolation-cover.jpg',
    galleryImages: [],
    isActive: true,
    order: 4,
    subServices: [
      {
        id: 'sub-005',
        slug: 'isolation-combles',
        name: { fr: 'Isolation des combles', en: 'Attic insulation', de: 'Dachbodendämmung' },
        description: {
          fr: 'Soufflage laine de verre, ouate de cellulose ou laine de roche.',
          en: 'Glass wool, cellulose wadding or rock wool blowing.',
          de: 'Glaswolle-, Zellulosewatte- oder Steinwolle-Einblasung.',
        },
      },
    ],
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