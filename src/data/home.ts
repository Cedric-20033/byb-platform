import type { I18nField } from '@/lib/utils';

export type HomeAboutHighlight = {
  id: string;
  label: I18nField;
};

export type HomeAboutData = {
  imageSrc: string;
  imageAlt: I18nField;
  highlights: HomeAboutHighlight[];
};

export const homeAbout: HomeAboutData = {
  imageSrc: '/Images/equipe.jpg',
  imageAlt: {
    fr: "Photo de l'équipe BYB",
    en: 'Photo of the BYB team',
    de: 'Foto des BYB-Teams',
  },
  highlights: [
    {
      id: 'quality',
      label: {
        fr: 'Artisans qualifiés',
        en: 'Qualified craftsmen',
        de: 'Qualifizierte Handwerker',
      },
    },
    {
      id: 'freeQuote',
      label: {
        fr: 'Devis gratuit et sans engagement',
        en: 'Free, no-obligation quote',
        de: 'Kostenloses, unverbindliches Angebot',
      },
    },
    {
      id: 'certifiedMaterials',
      label: {
        fr: 'Matériaux certifiés, normes en vigueur',
        en: 'Certified materials, standards in force',
        de: 'Zertifizierte Materialien, geltende Normen',
      },
    },
    {
      id: 'regionalCoverage',
      label: {
        fr: 'Intervention dans toute la région',
        en: 'Service throughout the region',
        de: 'Einsatz in der gesamten Region',
      },
    },
  ],
};
