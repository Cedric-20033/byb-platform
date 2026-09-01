// src/domain/shared/MediaProvider.ts

/**
 * Port de sortie : contrat pour tout fournisseur de médias (images + vidéos).
 * Cloudinary l'implémente aujourd'hui depuis l'infrastructure ; un autre
 * service (ex: un CDN maison) pourra l'implémenter demain sans que le
 * domaine ou l'application n'aient à changer une seule ligne.
 */
export interface MediaProvider {
  /** Construit l'URL affichable d'un média à partir de son identifiant public. */
  getUrl(publicId: string, kind: MediaKind, options?: MediaTransformOptions): string;

  /** Image fixe extraite d'une vidéo, utilisée comme aperçu avant lecture. */
  getVideoThumbnailUrl(publicId: string): string;

  /** Envoie un fichier au stockage média et retourne son identifiant public. */
  upload(file: Buffer, folder: string, kind: MediaKind, options?: MediaUploadOptions): Promise<string>;

  /** Supprime un média du stockage. */
  delete(publicId: string, kind: MediaKind): Promise<void>;
}

export type MediaKind = 'image' | 'video';

export type MediaUploadOptions = {
  /**
   * Identifiant public explicite (ex: "toiture/toiture-cover"). Sans cette
   * valeur, le fournisseur en génère un aléatoire. La fournir rend l'upload
   * idempotent : relancer un script de migration écrase le même fichier au
   * lieu d'en créer un nouveau à chaque exécution.
   */
  publicId?: string;
};

export type MediaTransformOptions = {
  width?: number;
  height?: number;
  /** 'auto' laisse le fournisseur choisir la meilleure qualité selon le réseau du visiteur. */
  quality?: 'auto' | number;
  /** 'auto' sert le format le plus performant supporté par le navigateur (ex: webp, avif). */
  format?: 'auto' | 'webp' | 'mp4';
};
