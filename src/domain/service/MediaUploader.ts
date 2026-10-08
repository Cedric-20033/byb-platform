// src/domain/service/MediaUploader.ts
import type { MediaKind } from '@/domain/shared/MediaProvider';

/** Ce que le navigateur doit envoyer, tel quel, pour déposer un fichier sans connaître le secret du fournisseur. */
export type UploadAuthorization = {
  uploadUrl: string;
  /** Champs de formulaire (signature comprise) à joindre au fichier. */
  fields: Record<string, string>;
};

export type UploadAuthorizationRequest = {
  kind: MediaKind;
  folder: string;
  allowedFormats: readonly string[];
};

/**
 * Port de sortie : autorisation d'envoi direct depuis le navigateur et suppression d'assets.
 * Distinct de `MediaProvider`, qui ne construit que des URLs de lecture : ici on manipule
 * le secret du fournisseur, donc ce port n'est utilisable que côté serveur.
 */
export interface MediaUploader {
  authorizeUpload(request: UploadAuthorizationRequest): UploadAuthorization;
  deleteAsset(publicId: string, kind: MediaKind): Promise<void>;
}
