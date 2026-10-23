// src/application/services/AuthorizeMediaUpload.ts
import type { MediaKind } from '@/domain/shared/MediaProvider';
import { assertUploadAllowed, MEDIA_LIMITS, serviceMediaFolder } from '@/domain/service/MediaRules';
import type { MediaUploader, UploadAuthorization } from '@/domain/service/MediaUploader';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import { requireService } from './requireService';

export type AuthorizeMediaUploadInput = {
  serviceId: string;
  kind: MediaKind;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Use case : délivre l'autorisation d'envoi direct d'un fichier vers le stockage média.
 * Le fichier ne transite pas par nos serveurs et le secret du fournisseur ne quitte jamais le serveur.
 * Ne modifie aucun état du catalogue (le média n'existe qu'une fois enregistré par AttachServiceMedia) :
 * pas d'audit ici.
 */
export class AuthorizeMediaUpload {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly mediaUploader: MediaUploader,
  ) {}

  async execute(input: AuthorizeMediaUploadInput): Promise<UploadAuthorization> {
    const service = await requireService(this.serviceRepository, input.serviceId);
    assertUploadAllowed(input);

    return this.mediaUploader.authorizeUpload({
      kind: input.kind,
      folder: serviceMediaFolder(service.slug),
      allowedFormats: MEDIA_LIMITS[input.kind].formats,
    });
  }
}
