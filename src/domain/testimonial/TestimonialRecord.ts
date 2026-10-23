// src/domain/testimonial/TestimonialRecord.ts
import type { I18nText } from '@/domain/shared/I18nText';

/**
 * Témoignage tel que l'administration le gère (modèle d'écriture : traduction brute, statut de
 * publication, rang). Distinct du type `Testimonial` de `@/types`, qui est le modèle de LECTURE du
 * site public (déjà filtré, sans statut ni rang).
 */
export type TestimonialRecord = {
  id: string;
  /** Nom propre de l'auteur : non traduit. */
  authorName: string;
  /** Ville ou commune de l'auteur : non traduite. Chaîne vide si inconnue. */
  authorLocation: string;
  content: I18nText;
  /** Note entière de 1 à 5 (voir `assertValidRating`). */
  rating: number;
  /** Date de l'avis au format AAAA-MM-JJ (jour calendaire, sans fuseau). */
  date: string;
  /** public_id du fournisseur média ; jamais une URL complète. */
  avatarPublicId: string | null;
  isPublished: boolean;
  order: number;
};

/** Contenu éditable d'un témoignage (la publication, le rang et l'avatar ont leurs propres règles). */
export type TestimonialContent = Pick<TestimonialRecord, 'authorName' | 'authorLocation' | 'content' | 'rating' | 'date'>;

export type NewTestimonial = TestimonialContent & Pick<TestimonialRecord, 'avatarPublicId' | 'isPublished' | 'order'>;
