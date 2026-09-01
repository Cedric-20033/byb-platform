// src/infrastructure/cloudinary/CloudinaryMediaProvider.ts
import { v2 as cloudinary } from 'cloudinary';
import type { MediaProvider, MediaKind, MediaTransformOptions, MediaUploadOptions } from '@/domain/shared/MediaProvider';

let configured = false;

/**
 * Configuration paresseuse (au premier appel, pas à l'import du module).
 * Nécessaire pour les scripts tsx (scripts/migrate-services-to-supabase.ts) :
 * ceux-ci chargent .env.local eux-mêmes au runtime, après que les imports
 * ES modules — dont celui-ci — ont déjà été résolus. Configurer au niveau
 * module capturerait des variables d'environnement encore vides.
 */
function ensureConfigured(): void {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

/**
 * Implémentation Cloudinary du contrat MediaProvider.
 *
 * Réservé au serveur : dépend de CLOUDINARY_API_SECRET, qui ne doit jamais
 * être exposé au navigateur. Pour construire une URL de lecture côté client
 * (sans upload/suppression), utiliser src/lib/cloudinary-url.ts à la place.
 *
 * Le jour où le client change de fournisseur média, seul ce fichier est
 * remplacé (ex: infrastructure/xxx/XxxMediaProvider.ts) — aucun autre point
 * du code ne connaît Cloudinary, conformément à l'inversion de dépendance.
 */
export class CloudinaryMediaProvider implements MediaProvider {
  getUrl(publicId: string, kind: MediaKind, options: MediaTransformOptions = {}): string {
    ensureConfigured();
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: kind === 'video' ? 'video' : 'image',
      quality: options.quality ?? 'auto',
      fetch_format: options.format ?? 'auto',
      width: options.width,
      height: options.height,
      crop: options.width || options.height ? 'fill' : undefined,
    });
  }

  getVideoThumbnailUrl(publicId: string): string {
    ensureConfigured();
    // Cloudinary génère une frame fixe depuis une vidéo en demandant
    // simplement une sortie jpg sur une ressource de type "video".
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: 'video',
      format: 'jpg',
      quality: 'auto',
    });
  }

  async upload(file: Buffer, folder: string, kind: MediaKind, options: MediaUploadOptions = {}): Promise<string> {
    ensureConfigured();
    const result = await new Promise<{ public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: kind === 'video' ? 'video' : 'image',
            // Un public_id explicite rend l'upload idempotent : relancer le
            // script de migration écrase le même fichier au lieu d'en créer
            // un nouveau à chaque exécution (cf. scripts/migrate-services-to-supabase.ts).
            public_id: options.publicId,
            overwrite: options.publicId ? true : undefined,
          },
          (error, uploadResult) => {
            if (error || !uploadResult) return reject(error);
            resolve(uploadResult);
          },
        )
        .end(file);
    });
    return result.public_id;
  }

  async delete(publicId: string, kind: MediaKind): Promise<void> {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId, {
      resource_type: kind === 'video' ? 'video' : 'image',
    });
  }
}
