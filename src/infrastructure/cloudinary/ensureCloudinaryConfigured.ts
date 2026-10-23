// src/infrastructure/cloudinary/ensureCloudinaryConfigured.ts
import { v2 as cloudinary } from 'cloudinary';

let configured = false;

/**
 * Configuration paresseuse du SDK Cloudinary, partagée par `CloudinaryMediaProvider` et
 * `CloudinaryMediaUploader` : les variables d'environnement sont lues au premier appel, pas à l'import
 * (les scripts tsx chargent `.env.local` après la résolution des imports).
 *
 * Le nom du compte n'est pas un secret : `CLOUDINARY_CLOUD_NAME` est prioritaire, mais on se replie sur
 * `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, la seule que `src/lib/env.ts` exige en production. Sans ce repli,
 * un déploiement valide au démarrage échouait à la première signature d'envoi du dashboard.
 */
export function ensureCloudinaryConfigured(): void {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}
