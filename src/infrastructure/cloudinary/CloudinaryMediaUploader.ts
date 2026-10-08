// src/infrastructure/cloudinary/CloudinaryMediaUploader.ts
import { v2 as cloudinary } from 'cloudinary';
import type {
  MediaUploader,
  UploadAuthorization,
  UploadAuthorizationRequest,
} from '@/domain/service/MediaUploader';
import type { MediaKind } from '@/domain/shared/MediaProvider';

let configured = false;

/** Configuration paresseuse, comme `CloudinaryMediaProvider` : les variables d'env sont lues au premier appel. */
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
 * Envoi direct navigateur → Cloudinary : le serveur ne signe que les paramètres, le fichier
 * ne transite jamais par une Server Action (pas de limite de corps de requête pour les vidéos).
 *
 * Seuls les paramètres signés (`folder`, `allowed_formats`, `timestamp`) sont contraints par
 * Cloudinary. La taille maximale ne peut pas l'être par signature : elle est vérifiée avant
 * l'autorisation (`assertUploadAllowed`) et, pour un plafond strict, doit être posée côté
 * Cloudinary via un upload preset.
 */
export class CloudinaryMediaUploader implements MediaUploader {
  authorizeUpload({ kind, folder, allowedFormats }: UploadAuthorizationRequest): UploadAuthorization {
    ensureConfigured();
    const { cloud_name, api_key, api_secret } = cloudinary.config();
    if (!cloud_name || !api_key || !api_secret) {
      throw new Error('Configuration Cloudinary incomplète (CLOUDINARY_*).');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const allowed_formats = allowedFormats.join(',');
    // Tous les champs signés doivent être renvoyés à l'identique par le navigateur.
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder, allowed_formats }, api_secret);

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloud_name}/${kind}/upload`,
      fields: {
        api_key,
        timestamp: String(timestamp),
        signature,
        folder,
        allowed_formats,
      },
    };
  }

  async deleteAsset(publicId: string, kind: MediaKind): Promise<void> {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId, { resource_type: kind === 'video' ? 'video' : 'image' });
  }
}
