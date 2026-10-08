// src/components/admin/services/ServiceMediaManager.tsx
'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Film, ImagePlus, Star, Trash2 } from 'lucide-react';
import {
  attachServiceMediaAction,
  authorizeMediaUploadAction,
  removeServiceMediaAction,
  reorderServiceMediaAction,
  setServiceCoverAction,
} from '@/app/actions/admin/serviceMedia';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MEDIA_LIMITS } from '@/domain/service/MediaRules';
import type { CatalogMedia, CatalogService } from '@/domain/service/CatalogService';
import type { UploadAuthorization } from '@/domain/service/MediaUploader';
import type { MediaKind } from '@/domain/shared/MediaProvider';
import { cloudinaryImageUrl, cloudinaryVideoThumbnailUrl } from '@/lib/cloudinary-url';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { ActionError, type ActionFailure } from '@/lib/errors';
import { ConfirmDialog } from '../ConfirmDialog';
import { SortableList } from '../SortableList';
import { usePermissions } from '../PermissionsProvider';
import { useInvalidateCatalog } from './catalogQuery';

const MEGABYTE = 1024 * 1024;

/** Déduit le type de média du MIME ; `null` si le fichier n'est ni une image ni une vidéo. */
function kindOf(file: File): MediaKind | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

/**
 * Envoi direct vers le fournisseur avec l'autorisation signée par le serveur : le fichier ne
 * passe jamais par une Server Action (limite de taille du corps de requête).
 */
async function uploadToProvider(file: File, { uploadUrl, fields }: UploadAuthorization): Promise<string> {
  const body = new FormData();
  // Les champs signés d'abord : le fournisseur exige que `file` soit le dernier champ.
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  body.append('file', file);

  const response = await fetch(uploadUrl, { method: 'POST', body });
  if (!response.ok) throw new Error(`Upload refusé (${response.status})`);

  const { public_id: publicId } = (await response.json()) as { public_id: string };
  return publicId;
}

export function ServiceMediaManager({ service }: { service: CatalogService }) {
  const t = useTranslations('admin.catalog.media');
  const tToast = useTranslations('admin.catalog.toast');
  const tConfirm = useTranslations('admin.catalog.confirm');
  const errorMessage = useErrorMessage();
  const invalidateCatalog = useInvalidateCatalog();
  const { can } = usePermissions();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<CatalogMedia | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const canCreate = can('services', 'create');
  const canEdit = can('services', 'edit');
  const canDelete = can('services', 'delete');

  async function uploadOne(file: File) {
    const kind = kindOf(file);
    if (!kind) throw new ActionError('MEDIA_TYPE_NOT_ALLOWED');

    // Contrôle d'ergonomie : le serveur refait les mêmes vérifications avant de signer.
    const limits = MEDIA_LIMITS[kind];
    if (!limits.mimeTypes.includes(file.type)) throw new ActionError('MEDIA_TYPE_NOT_ALLOWED');
    if (file.size > limits.maxBytes) throw new ActionError('MEDIA_TOO_LARGE');

    const { authorization } = unwrapAction(
      await authorizeMediaUploadAction({ serviceId: service.id, kind, mimeType: file.type, sizeBytes: file.size }),
    );
    const publicId = await uploadToProvider(file, authorization);
    unwrapAction(await attachServiceMediaAction({ serviceId: service.id, kind, publicId }));
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;

    // Séquentiel : le premier média image devient la couverture, l'ordre doit rester déterministe.
    for (const file of Array.from(files)) {
      setUploadingName(file.name);
      try {
        await uploadOne(file);
        toast.success(tToast('mediaAdded'));
      } catch (error) {
        toast.error(
          error instanceof ActionError ? errorMessage(error) : t('uploadFailed', { name: file.name }),
        );
      }
    }

    setUploadingName(null);
    if (inputRef.current) inputRef.current.value = '';
    await invalidateCatalog();
  }

  async function run(action: () => Promise<{ success: true } | ActionFailure>, success: string) {
    try {
      unwrapAction(await action());
      toast.success(success);
      await invalidateCatalog();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function onReorder(ordered: CatalogMedia[]) {
    try {
      unwrapAction(await reorderServiceMediaAction({ serviceId: service.id, orderedIds: ordered.map((m) => m.id) }));
      await invalidateCatalog();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function confirmRemove() {
    if (!toRemove) return;
    setIsRemoving(true);
    await run(() => removeServiceMediaAction({ mediaId: toRemove.id }), tToast('mediaRemoved'));
    setIsRemoving(false);
    setToRemove(null);
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-[var(--font-display)] font-bold">{t('title')}</h2>
          <p className="text-xs text-[var(--color-muted)]">
            {t('hint', {
              imageMax: MEDIA_LIMITS.image.maxBytes / MEGABYTE,
              videoMax: MEDIA_LIMITS.video.maxBytes / MEGABYTE,
            })}
          </p>
        </div>

        {canCreate && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              accept={[...MEDIA_LIMITS.image.mimeTypes, ...MEDIA_LIMITS.video.mimeTypes].join(',')}
              onChange={(event) => onFilesSelected(event.target.files)}
            />
            <Button
              size="sm"
              variant="outline"
              isLoading={uploadingName !== null}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus size={14} />
              {uploadingName ? t('uploading', { name: uploadingName }) : t('upload')}
            </Button>
          </>
        )}
      </div>

      {service.media.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('empty')}</p>
      ) : (
        <SortableList
          items={service.media}
          getId={(media) => media.id}
          onReorder={onReorder}
          disabled={!canEdit}
          className="space-y-2"
          itemClassName="rounded-[var(--radius-md)] border border-[var(--color-border)] p-2"
          renderItem={(media, index) => (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniature distante, pas de gain à l'optimiser */}
              <img
                src={
                  media.type === 'video'
                    ? cloudinaryVideoThumbnailUrl(media.publicId)
                    : cloudinaryImageUrl(media.publicId, { width: 160, height: 120 })
                }
                alt={t('imageAlt', { index: index + 1, name: service.name.fr })}
                width={80}
                height={60}
                className="w-20 h-[60px] object-cover rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] shrink-0"
              />

              <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                {media.type === 'video' && (
                  <Badge tone="neutral">
                    <Film size={12} className="mr-1" />
                    {t('video')}
                  </Badge>
                )}
                {media.isCover && (
                  <Badge tone="success">
                    <Star size={12} className="mr-1" />
                    {t('cover')}
                  </Badge>
                )}
              </div>

              <div className="flex gap-1 shrink-0">
                {canEdit && media.type === 'image' && !media.isCover && (
                  <button
                    type="button"
                    title={t('makeCover')}
                    aria-label={t('makeCover')}
                    onClick={() => run(() => setServiceCoverAction({ mediaId: media.id }), tToast('coverChanged'))}
                    className="p-2 rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]"
                  >
                    <Star size={15} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    title={t('remove')}
                    aria-label={t('remove')}
                    onClick={() => setToRemove(media)}
                    className="p-2 rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-secondary)]/10 hover:text-[var(--color-secondary)]"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          )}
        />
      )}

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title={t('removeTitle')}
        description={t('removeDescription')}
        confirmLabel={tConfirm('confirm')}
        cancelLabel={tConfirm('cancel')}
        onConfirm={confirmRemove}
        isSubmitting={isRemoving}
        destructive
      />
    </Card>
  );
}
