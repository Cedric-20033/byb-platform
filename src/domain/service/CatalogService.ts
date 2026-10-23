// src/domain/service/CatalogService.ts
import type { I18nText } from '@/domain/shared/I18nText';
import type { MediaKind } from '@/domain/shared/MediaProvider';

/**
 * Modèle d'écriture du catalogue. Il est distinct du type `Service` de `@/types`, qui est
 * un modèle de LECTURE pour le site public (couverture/galerie déjà aplaties) : l'édition
 * a besoin des identifiants de chaque média et de la valeur brute de chaque traduction.
 */
export type CatalogSubService = {
  id: string;
  serviceId: string;
  slug: string;
  name: I18nText;
  description: I18nText;
  order: number;
};

export type CatalogMedia = {
  id: string;
  serviceId: string;
  type: MediaKind;
  /** Identifiant du fournisseur média (jamais une URL complète). */
  publicId: string;
  isCover: boolean;
  order: number;
};

export type CatalogService = {
  id: string;
  /** Stable après création : il fait partie des URL publiques et des liens de réservation. */
  slug: string;
  name: I18nText;
  shortDescription: I18nText;
  fullDescription: I18nText;
  /** Nom d'une icône Lucide. */
  icon: string;
  isActive: boolean;
  order: number;
  subServices: CatalogSubService[];
  media: CatalogMedia[];
};

/** Contenu éditable d'un service (le slug et l'ordre ont leurs propres règles). */
export type ServiceContent = Pick<CatalogService, 'name' | 'shortDescription' | 'fullDescription' | 'icon'>;

export type NewService = ServiceContent & Pick<CatalogService, 'slug' | 'isActive' | 'order'>;

export type SubServiceContent = Pick<CatalogSubService, 'name' | 'description'>;

export type NewSubService = SubServiceContent & Pick<CatalogSubService, 'serviceId' | 'slug' | 'order'>;

export type NewMedia = Pick<CatalogMedia, 'serviceId' | 'type' | 'publicId' | 'isCover' | 'order'>;
