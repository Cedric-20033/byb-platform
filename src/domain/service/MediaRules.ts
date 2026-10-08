// src/domain/service/MediaRules.ts
import { DomainError } from '@/domain/shared/DomainError';
import type { MediaKind } from '@/domain/shared/MediaProvider';

const MEGABYTE = 1024 * 1024;

/** Limites par type de média (CLAUDE.md P3.3 : images ≤ 10 Mo, vidéos ≤ 100 Mo). */
export const MEDIA_LIMITS: Record<MediaKind, { maxBytes: number; mimeTypes: readonly string[]; formats: readonly string[] }> = {
  image: {
    maxBytes: 10 * MEGABYTE,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
  },
  video: {
    maxBytes: 100 * MEGABYTE,
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    formats: ['mp4', 'mov', 'webm'],
  },
};

/** Dossier racine du stockage média pour les services (identique à celui du script de migration). */
export const SERVICE_MEDIA_ROOT = 'byb/services';

export function serviceMediaFolder(serviceSlug: string): string {
  return `${SERVICE_MEDIA_ROOT}/${serviceSlug}`;
}

/**
 * Vérifie type MIME et taille annoncés d'un fichier AVANT de délivrer une autorisation d'envoi.
 * Ce contrôle est celui du serveur : le navigateur le répète pour l'ergonomie, mais ne le remplace pas.
 */
export function assertUploadAllowed(input: { kind: MediaKind; mimeType: string; sizeBytes: number }): void {
  const limits = MEDIA_LIMITS[input.kind];

  if (!limits.mimeTypes.includes(input.mimeType)) {
    throw new DomainError(`Type de fichier refusé : ${input.mimeType}`, 'MEDIA_TYPE_NOT_ALLOWED');
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > limits.maxBytes) {
    throw new DomainError(`Fichier trop volumineux : ${input.sizeBytes} octets`, 'MEDIA_TOO_LARGE');
  }
}

/**
 * Un média enregistré doit résider dans le dossier de SON service : sans cette vérification,
 * un admin pourrait rattacher à un service le public_id d'un média d'un autre (ou de n'importe
 * quel asset du compte), puis le supprimer en retirant le média.
 */
export function assertInServiceFolder(publicId: string, serviceSlug: string): void {
  if (!publicId.startsWith(`${serviceMediaFolder(serviceSlug)}/`) || publicId.includes('..')) {
    throw new DomainError(`Média hors du dossier du service : ${publicId}`, 'MEDIA_FOLDER_MISMATCH');
  }
}
