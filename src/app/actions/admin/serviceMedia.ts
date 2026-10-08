'use server';

// src/app/actions/admin/serviceMedia.ts
import { AttachServiceMedia } from '@/application/services/AttachServiceMedia';
import { AuthorizeMediaUpload } from '@/application/services/AuthorizeMediaUpload';
import { RemoveServiceMedia } from '@/application/services/RemoveServiceMedia';
import { ReorderServiceMedia } from '@/application/services/ReorderServiceMedia';
import { SetServiceCover } from '@/application/services/SetServiceCover';
import type { CatalogMedia } from '@/domain/service/CatalogService';
import type { UploadAuthorization } from '@/domain/service/MediaUploader';
import { revalidateCatalog } from '@/lib/cache/revalidateCatalog';
import { createCatalogDeps } from '@/lib/catalog/catalogComposition';
import { assertPermission, getCurrentAdmin, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import {
  attachServiceMediaSchema,
  authorizeMediaUploadSchema,
  mediaIdSchema,
  reorderServiceMediaSchema,
} from '@/lib/validation/services';

/**
 * Médias d'un service. Le fichier ne passe jamais par ces actions : le navigateur l'envoie
 * directement au fournisseur avec l'autorisation signée délivrée ici, puis enregistre le résultat.
 * Les permissions suivent la RLS (0006) : ajouter = `create`, retirer = `delete`, le reste = `edit`.
 */
type AuthorizeResult = { success: true; authorization: UploadAuthorization } | ActionFailure;
type MediaResult = { success: true; media: CatalogMedia } | ActionFailure;
type VoidResult = { success: true } | ActionFailure;

export async function authorizeMediaUploadAction(input: unknown): Promise<AuthorizeResult> {
  try {
    const parsed = authorizeMediaUploadSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    assertPermission(await getCurrentAdmin(), 'services', 'create');

    const deps = await createCatalogDeps();
    const authorization = await new AuthorizeMediaUpload(deps.services, deps.uploader).execute(parsed.data);
    return { success: true, authorization };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function attachServiceMediaAction(input: unknown): Promise<MediaResult> {
  try {
    const parsed = attachServiceMediaSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'create');

    const deps = await createCatalogDeps();
    const media = await new AttachServiceMedia(deps.services, deps.media, deps.audit).execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true, media };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function removeServiceMediaAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = mediaIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'delete');

    const deps = await createCatalogDeps();
    await new RemoveServiceMedia(deps.services, deps.media, deps.uploader, deps.audit).execute({
      mediaId: parsed.data.mediaId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function setServiceCoverAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = mediaIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'edit');

    const deps = await createCatalogDeps();
    await new SetServiceCover(deps.media, deps.audit).execute({
      mediaId: parsed.data.mediaId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function reorderServiceMediaAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = reorderServiceMediaSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'edit');

    const deps = await createCatalogDeps();
    await new ReorderServiceMedia(deps.services, deps.media, deps.audit).execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
