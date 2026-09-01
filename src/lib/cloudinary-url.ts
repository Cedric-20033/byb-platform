// src/lib/cloudinary-url.ts

/**
 * Construction d'URL Cloudinary en lecture seule, utilisable côté navigateur.
 *
 * Contrairement à CloudinaryMediaProvider (infrastructure/cloudinary), ce
 * fichier ne dépend d'aucune clé secrète : il ne fait que composer une URL
 * publique à partir du cloud_name, exposé sans risque via NEXT_PUBLIC_.
 * Réservé à l'affichage (composants client) — jamais à l'upload/suppression.
 */
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

type ImageUrlOptions = {
  width?: number;
  height?: number;
};

export function cloudinaryImageUrl(publicId: string, options: ImageUrlOptions = {}): string {
  const transforms = ['f_auto', 'q_auto'];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`, 'c_fill');

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms.join(',')}/${publicId}`;
}

export function cloudinaryVideoUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/f_auto,q_auto/${publicId}.mp4`;
}

/** Frame fixe extraite d'une vidéo, utilisée comme poster avant lecture. */
export function cloudinaryVideoThumbnailUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/f_auto,q_auto/${publicId}.jpg`;
}
