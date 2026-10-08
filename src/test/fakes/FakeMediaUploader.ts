// src/test/fakes/FakeMediaUploader.ts
import type { MediaUploader, UploadAuthorization, UploadAuthorizationRequest } from '@/domain/service/MediaUploader';
import type { MediaKind } from '@/domain/shared/MediaProvider';

/** Fournisseur média factice : mémorise les autorisations délivrées et les assets supprimés. */
export class FakeMediaUploader implements MediaUploader {
  readonly authorizations: UploadAuthorizationRequest[] = [];
  readonly deleted: { publicId: string; kind: MediaKind }[] = [];
  /** Fait échouer la suppression d'assets (panne du fournisseur). */
  failDeletes = false;

  authorizeUpload(request: UploadAuthorizationRequest): UploadAuthorization {
    this.authorizations.push(request);
    return { uploadUrl: `https://upload.test/${request.kind}`, fields: { folder: request.folder, signature: 'sig' } };
  }

  async deleteAsset(publicId: string, kind: MediaKind): Promise<void> {
    if (this.failDeletes) throw new Error('provider down');
    this.deleted.push({ publicId, kind });
  }
}
