// src/application/services/services.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import type { CatalogService } from '@/domain/service/CatalogService';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { DomainError, type DomainErrorCode } from '@/domain/shared/DomainError';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeMediaUploader } from '@/test/fakes/FakeMediaUploader';
import { InMemoryServiceCatalog } from '@/test/fakes/InMemoryServiceCatalog';
import { InMemoryServiceMediaRepository } from '@/test/fakes/InMemoryServiceMediaRepository';
import { InMemorySubServiceRepository } from '@/test/fakes/InMemorySubServiceRepository';
import { ArchiveService, RestoreService } from './SetServiceActive';
import { AttachServiceMedia } from './AttachServiceMedia';
import { AuthorizeMediaUpload } from './AuthorizeMediaUpload';
import { CreateService } from './CreateService';
import { CreateSubService } from './CreateSubService';
import { DeleteService } from './DeleteService';
import { DeleteSubService } from './DeleteSubService';
import { RemoveServiceMedia } from './RemoveServiceMedia';
import { ReorderServiceMedia } from './ReorderServiceMedia';
import { ReorderServices } from './ReorderServices';
import { ReorderSubServices } from './ReorderSubServices';
import { SetServiceCover } from './SetServiceCover';
import { UpdateService } from './UpdateService';
import { UpdateSubService } from './UpdateSubService';

const actor = { actorId: 'admin-1', actorRole: ActorRole.ADMIN };

const texts = (fr: string) => ({ fr });
const serviceInput = (name: string) => ({
  name: texts(name),
  shortDescription: texts(`${name} — court`),
  fullDescription: texts(`${name} — long`),
  icon: 'Home',
});

/** Échec attendu d'un use case : renvoie son code métier, ou `null` si rien n'a été levé. */
async function failureCode(promise: Promise<unknown>): Promise<DomainErrorCode | 'OTHER' | null> {
  try {
    await promise;
  } catch (error) {
    return error instanceof DomainError ? error.code : 'OTHER';
  }
  return null;
}

let catalog: InMemoryServiceCatalog;
let subs: InMemorySubServiceRepository;
let media: InMemoryServiceMediaRepository;
let uploader: FakeMediaUploader;
let audit: FakeAuditLogger;

beforeEach(() => {
  catalog = new InMemoryServiceCatalog();
  subs = new InMemorySubServiceRepository(catalog);
  media = new InMemoryServiceMediaRepository(catalog);
  uploader = new FakeMediaUploader();
  audit = new FakeAuditLogger();
});

const create = (name: string, extra: { slug?: string } = {}) =>
  new CreateService(catalog, audit).execute({ ...actor, ...serviceInput(name), ...extra });

/** Service prêt à être activé : créé puis doté d'une image. */
async function createWithCover(name: string): Promise<CatalogService> {
  const service = await create(name);
  await new AttachServiceMedia(catalog, media, audit).execute({
    ...actor,
    serviceId: service.id,
    kind: 'image',
    publicId: `byb/services/${service.slug}/cover`,
  });
  audit.entries.length = 0;
  return (await catalog.findById(service.id))!;
}

describe('CreateService', () => {
  it('crée un service INACTIF, avec un slug dérivé du nom français', async () => {
    const service = await create('Toiture Pentue');

    expect(service.slug).toBe('toiture-pentue');
    expect(service.isActive).toBe(false);
    expect(service.order).toBe(0);
  });

  it('ajoute chaque nouveau service en fin de liste', async () => {
    await create('A');
    const second = await create('B');
    expect(second.order).toBe(1);
  });

  it('respecte un slug explicite', async () => {
    expect((await create('Toiture', { slug: 'roofing' })).slug).toBe('roofing');
  });

  it('refuse un slug déjà pris', async () => {
    await create('Toiture');
    expect(await failureCode(create('Autre', { slug: 'toiture' }))).toBe('SERVICE_SLUG_TAKEN');
  });

  it('refuse un slug invalide ou un nom dont le slug serait vide', async () => {
    expect(await failureCode(create('Toiture', { slug: 'Pas Valide' }))).toBe('SLUG_INVALID');
    expect(await failureCode(create('!!!'))).toBe('SLUG_INVALID');
  });

  it('exige le français', async () => {
    const input = { ...actor, ...serviceInput('X'), shortDescription: { fr: '  ' } };
    expect(await failureCode(new CreateService(catalog, audit).execute(input))).toBe('TRANSLATION_FR_REQUIRED');
    expect(catalog.rows).toHaveLength(0);
  });

  it('journalise la création', async () => {
    const service = await create('Toiture');
    expect(audit.entries).toEqual([
      expect.objectContaining({
        action: AuditAction.SERVICE_CREATED,
        targetType: 'service',
        targetId: service.id,
        actorId: 'admin-1',
      }),
    ]);
  });
});

describe('UpdateService', () => {
  it('met à jour le contenu et journalise les seuls champs modifiés', async () => {
    const service = await create('Toiture');
    audit.entries.length = 0;

    const updated = await new UpdateService(catalog, audit).execute({
      ...actor,
      serviceId: service.id,
      ...serviceInput('Toiture'),
      icon: 'Triangle',
    });

    expect(updated.icon).toBe('Triangle');
    expect(updated.slug).toBe('toiture');
    expect(audit.entries[0]).toMatchObject({
      action: AuditAction.SERVICE_UPDATED,
      metadata: { changedFields: ['icon'] },
    });
  });

  it('ne modifie pas le slug même si le nom change', async () => {
    const service = await create('Toiture');
    const updated = await new UpdateService(catalog, audit).execute({
      ...actor,
      serviceId: service.id,
      ...serviceInput('Couverture'),
    });
    expect(updated.slug).toBe('toiture');
    expect(updated.name.fr).toBe('Couverture');
  });

  it('ne journalise rien quand rien ne change', async () => {
    const service = await create('Toiture');
    audit.entries.length = 0;
    await new UpdateService(catalog, audit).execute({ ...actor, serviceId: service.id, ...serviceInput('Toiture') });
    expect(audit.entries).toHaveLength(0);
  });

  it('refuse un service inconnu', async () => {
    const run = new UpdateService(catalog, audit).execute({ ...actor, serviceId: 'nope', ...serviceInput('X') });
    expect(await failureCode(run)).toBe('SERVICE_NOT_FOUND');
  });
});

describe('ArchiveService / RestoreService', () => {
  it('refuse d’activer un service sans image de couverture', async () => {
    const service = await create('Toiture');
    expect(await failureCode(new RestoreService(catalog, audit).execute({ ...actor, serviceId: service.id }))).toBe(
      'SERVICE_COVER_REQUIRED',
    );
    expect((await catalog.findById(service.id))!.isActive).toBe(false);
  });

  it('active puis archive un service doté d’une image, avec audit', async () => {
    const service = await createWithCover('Toiture');

    await new RestoreService(catalog, audit).execute({ ...actor, serviceId: service.id });
    expect((await catalog.findById(service.id))!.isActive).toBe(true);

    await new ArchiveService(catalog, audit).execute({ ...actor, serviceId: service.id });
    expect((await catalog.findById(service.id))!.isActive).toBe(false);

    expect(audit.entries.map((e) => e.metadata)).toEqual([{ isActive: true }, { isActive: false }]);
  });

  it('est idempotent : aucun audit si l’état est déjà celui demandé', async () => {
    const service = await create('Toiture');
    await new ArchiveService(catalog, audit).execute({ ...actor, serviceId: service.id });
    expect(audit.entries).toHaveLength(1); // seule la création
  });

  it('un vidéo seule ne suffit pas à activer un service', async () => {
    const service = await create('Toiture');
    await new AttachServiceMedia(catalog, media, audit).execute({
      ...actor,
      serviceId: service.id,
      kind: 'video',
      publicId: 'byb/services/toiture/clip',
    });
    expect(await failureCode(new RestoreService(catalog, audit).execute({ ...actor, serviceId: service.id }))).toBe(
      'SERVICE_COVER_REQUIRED',
    );
  });
});

describe('DeleteService', () => {
  const build = () => new DeleteService(catalog, catalog, uploader, audit);

  it('refuse de supprimer un service qui a des rendez-vous', async () => {
    const service = await create('Toiture');
    catalog.bookedServiceIds.add(service.id);

    expect(await failureCode(build().execute({ ...actor, serviceId: service.id }))).toBe('SERVICE_HAS_APPOINTMENTS');
    expect(catalog.rows).toHaveLength(1);
  });

  it('supprime le service, recompacte l’ordre et efface les médias du stockage', async () => {
    const first = await createWithCover('A');
    const second = await createWithCover('B');
    const third = await create('C');

    await build().execute({ ...actor, serviceId: first.id });

    const remaining = await catalog.findAll();
    expect(remaining.map((s) => [s.id, s.order])).toEqual([
      [second.id, 0],
      [third.id, 1],
    ]);
    expect(uploader.deleted).toEqual([{ publicId: 'byb/services/a/cover', kind: 'image' }]);
    expect(audit.entries.at(-1)).toMatchObject({ action: AuditAction.SERVICE_DELETED, targetId: first.id });
  });

  it('réussit même si le fournisseur média est en panne', async () => {
    const service = await createWithCover('A');
    uploader.failDeletes = true;

    await build().execute({ ...actor, serviceId: service.id });

    expect(catalog.rows).toHaveLength(0);
    expect(audit.entries.at(-1)?.action).toBe(AuditAction.SERVICE_DELETED);
  });

  it('refuse un service inconnu', async () => {
    expect(await failureCode(build().execute({ ...actor, serviceId: 'nope' }))).toBe('SERVICE_NOT_FOUND');
  });
});

describe('ReorderServices', () => {
  const build = () => new ReorderServices(catalog, audit);

  it('applique un nouvel ordre contigu et journalise', async () => {
    const a = await create('A');
    const b = await create('B');
    const c = await create('C');
    audit.entries.length = 0;

    await build().execute({ ...actor, orderedIds: [c.id, a.id, b.id] });

    expect((await catalog.findAll()).map((s) => [s.id, s.order])).toEqual([
      [c.id, 0],
      [a.id, 1],
      [b.id, 2],
    ]);
    expect(audit.entries).toHaveLength(1);
  });

  it('ne fait rien (ni audit) si l’ordre est inchangé', async () => {
    const a = await create('A');
    const b = await create('B');
    audit.entries.length = 0;

    await build().execute({ ...actor, orderedIds: [a.id, b.id] });
    expect(audit.entries).toHaveLength(0);
  });

  it('refuse un ordre périmé (service ajouté entre-temps par un autre admin)', async () => {
    const a = await create('A');
    await create('B');

    expect(await failureCode(build().execute({ ...actor, orderedIds: [a.id] }))).toBe('SERVICE_ORDER_INVALID');
  });
});

describe('sous-prestations', () => {
  const subInput = (serviceId: string, name: string) => ({
    ...actor,
    serviceId,
    name: texts(name),
    description: texts(`${name} — détail`),
  });
  const createSub = (serviceId: string, name: string) =>
    new CreateSubService(catalog, subs, audit).execute(subInput(serviceId, name));

  it('crée des sous-prestations ordonnées, au slug unique par service', async () => {
    const roof = await create('Toiture');
    const other = await create('Isolation');

    const first = await createSub(roof.id, 'Toiture pentue');
    const second = await createSub(roof.id, 'Toiture plate');

    expect([first.order, second.order]).toEqual([0, 1]);
    expect(await failureCode(createSub(roof.id, 'Toiture pentue'))).toBe('SUB_SERVICE_SLUG_TAKEN');
    // Le même slug est libre dans un autre service.
    expect((await createSub(other.id, 'Toiture pentue')).slug).toBe('toiture-pentue');
  });

  it('refuse un service inconnu', async () => {
    expect(await failureCode(createSub('nope', 'X'))).toBe('SERVICE_NOT_FOUND');
  });

  it('modifie le contenu sans toucher au slug, et ignore une modification nulle', async () => {
    const service = await create('Toiture');
    const sub = await createSub(service.id, 'Pentue');
    audit.entries.length = 0;
    const update = new UpdateSubService(subs, audit);

    await update.execute({ ...actor, subServiceId: sub.id, name: texts('Pentue'), description: texts('Pentue — détail') });
    expect(audit.entries).toHaveLength(0);

    const updated = await update.execute({ ...actor, subServiceId: sub.id, name: texts('Très pentue'), description: texts('d') });
    expect(updated.slug).toBe('pentue');
    expect(updated.name.fr).toBe('Très pentue');
    expect(audit.entries).toHaveLength(1);
  });

  it('refuse de modifier ou supprimer une sous-prestation inconnue', async () => {
    const input = { ...actor, subServiceId: 'nope', name: texts('X'), description: texts('Y') };
    expect(await failureCode(new UpdateSubService(subs, audit).execute(input))).toBe('SUB_SERVICE_NOT_FOUND');
    expect(await failureCode(new DeleteSubService(catalog, subs, audit).execute({ ...actor, subServiceId: 'nope' }))).toBe(
      'SUB_SERVICE_NOT_FOUND',
    );
  });

  it('recompacte l’ordre après suppression', async () => {
    const service = await create('Toiture');
    const a = await createSub(service.id, 'A');
    const b = await createSub(service.id, 'B');
    const c = await createSub(service.id, 'C');

    await new DeleteSubService(catalog, subs, audit).execute({ ...actor, subServiceId: a.id });

    const remaining = (await catalog.findById(service.id))!.subServices;
    expect(remaining.map((s) => [s.id, s.order])).toEqual([
      [b.id, 0],
      [c.id, 1],
    ]);
  });

  it('réordonne, refuse un ordre périmé, ignore l’ordre inchangé', async () => {
    const service = await create('Toiture');
    const a = await createSub(service.id, 'A');
    const b = await createSub(service.id, 'B');
    const reorder = new ReorderSubServices(catalog, subs, audit);
    audit.entries.length = 0;

    await reorder.execute({ ...actor, serviceId: service.id, orderedIds: [a.id, b.id] });
    expect(audit.entries).toHaveLength(0);

    await reorder.execute({ ...actor, serviceId: service.id, orderedIds: [b.id, a.id] });
    expect((await catalog.findById(service.id))!.subServices.map((s) => s.id)).toEqual([b.id, a.id]);

    expect(await failureCode(reorder.execute({ ...actor, serviceId: service.id, orderedIds: [a.id] }))).toBe(
      'SERVICE_ORDER_INVALID',
    );
  });
});

describe('médias', () => {
  const attach = (serviceId: string, kind: 'image' | 'video', publicId: string) =>
    new AttachServiceMedia(catalog, media, audit).execute({ ...actor, serviceId, kind, publicId });

  it('autorise l’envoi dans le dossier du service, avec les formats du type', async () => {
    const service = await create('Toiture');
    const authorization = await new AuthorizeMediaUpload(catalog, uploader).execute({
      serviceId: service.id,
      kind: 'image',
      mimeType: 'image/png',
      sizeBytes: 2048,
    });

    expect(authorization.uploadUrl).toContain('image');
    expect(uploader.authorizations[0]).toMatchObject({
      kind: 'image',
      folder: 'byb/services/toiture',
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    });
  });

  it('refuse l’autorisation d’un type interdit ou d’un fichier trop gros, sans rien délivrer', async () => {
    const service = await create('Toiture');
    const authorize = new AuthorizeMediaUpload(catalog, uploader);

    expect(
      await failureCode(authorize.execute({ serviceId: service.id, kind: 'image', mimeType: 'image/svg+xml', sizeBytes: 10 })),
    ).toBe('MEDIA_TYPE_NOT_ALLOWED');
    expect(
      await failureCode(
        authorize.execute({ serviceId: service.id, kind: 'video', mimeType: 'video/mp4', sizeBytes: 101 * 1024 * 1024 }),
      ),
    ).toBe('MEDIA_TOO_LARGE');
    expect(uploader.authorizations).toHaveLength(0);
  });

  it('le premier média image devient la couverture, pas les suivants ni une vidéo', async () => {
    const service = await create('Toiture');
    const video = await attach(service.id, 'video', 'byb/services/toiture/clip');
    const first = await attach(service.id, 'image', 'byb/services/toiture/a');
    const second = await attach(service.id, 'image', 'byb/services/toiture/b');

    expect([video.isCover, first.isCover, second.isCover]).toEqual([false, true, false]);
    expect([video.order, first.order, second.order]).toEqual([0, 1, 2]);
  });

  it('est idempotent : un public_id déjà rattaché est renvoyé sans doublon ni audit', async () => {
    const service = await create('Toiture');
    const first = await attach(service.id, 'image', 'byb/services/toiture/a');
    audit.entries.length = 0;

    const again = await attach(service.id, 'image', 'byb/services/toiture/a');
    expect(again.id).toBe(first.id);
    expect((await catalog.findById(service.id))!.media).toHaveLength(1);
    expect(audit.entries).toHaveLength(0);
  });

  it('refuse un média d’un autre dossier', async () => {
    const service = await create('Toiture');
    expect(await failureCode(attach(service.id, 'image', 'byb/services/isolation/a'))).toBe('MEDIA_FOLDER_MISMATCH');
  });

  it('change de couverture : une seule couverture à la fois, et seulement une image', async () => {
    const service = await create('Toiture');
    const first = await attach(service.id, 'image', 'byb/services/toiture/a');
    const second = await attach(service.id, 'image', 'byb/services/toiture/b');
    const clip = await attach(service.id, 'video', 'byb/services/toiture/clip');
    const setCover = new SetServiceCover(media, audit);

    await setCover.execute({ ...actor, mediaId: second.id });
    expect((await catalog.findById(service.id))!.media.filter((m) => m.isCover).map((m) => m.id)).toEqual([second.id]);

    expect(await failureCode(setCover.execute({ ...actor, mediaId: clip.id }))).toBe('MEDIA_COVER_MUST_BE_IMAGE');
    expect(await failureCode(setCover.execute({ ...actor, mediaId: 'nope' }))).toBe('MEDIA_NOT_FOUND');

    audit.entries.length = 0;
    await setCover.execute({ ...actor, mediaId: second.id });
    expect(audit.entries).toHaveLength(0);
    expect(first.isCover).toBe(false);
    expect(second.isCover).toBe(true);
  });

  it('retirer la couverture promeut l’image suivante, recompacte l’ordre et efface l’asset', async () => {
    const service = await create('Toiture');
    const cover = await attach(service.id, 'image', 'byb/services/toiture/a');
    const next = await attach(service.id, 'image', 'byb/services/toiture/b');
    const clip = await attach(service.id, 'video', 'byb/services/toiture/clip');

    await new RemoveServiceMedia(catalog, media, uploader, audit).execute({ ...actor, mediaId: cover.id });

    const remaining = (await catalog.findById(service.id))!.media;
    expect(remaining.map((m) => [m.id, m.order, m.isCover])).toEqual([
      [next.id, 0, true],
      [clip.id, 1, false],
    ]);
    expect(uploader.deleted).toEqual([{ publicId: 'byb/services/toiture/a', kind: 'image' }]);
  });

  it('retirer un média réussit même si la suppression de l’asset échoue', async () => {
    const service = await create('Toiture');
    const image = await attach(service.id, 'image', 'byb/services/toiture/a');
    uploader.failDeletes = true;

    await new RemoveServiceMedia(catalog, media, uploader, audit).execute({ ...actor, mediaId: image.id });
    expect((await catalog.findById(service.id))!.media).toHaveLength(0);
  });

  it('un service ACTIF ne peut pas perdre sa dernière image', async () => {
    const service = await createWithCover('Toiture');
    await new RestoreService(catalog, audit).execute({ ...actor, serviceId: service.id });
    const [cover] = (await catalog.findById(service.id))!.media;

    expect(await failureCode(new RemoveServiceMedia(catalog, media, uploader, audit).execute({ ...actor, mediaId: cover.id }))).toBe(
      'SERVICE_COVER_REQUIRED',
    );
    expect(uploader.deleted).toHaveLength(0);
  });

  it('refuse de retirer un média inconnu', async () => {
    expect(
      await failureCode(new RemoveServiceMedia(catalog, media, uploader, audit).execute({ ...actor, mediaId: 'nope' })),
    ).toBe('MEDIA_NOT_FOUND');
  });

  it('réordonne la galerie et refuse un ordre périmé', async () => {
    const service = await create('Toiture');
    const a = await attach(service.id, 'image', 'byb/services/toiture/a');
    const b = await attach(service.id, 'image', 'byb/services/toiture/b');
    const reorder = new ReorderServiceMedia(catalog, media, audit);

    await reorder.execute({ ...actor, serviceId: service.id, orderedIds: [b.id, a.id] });
    expect((await catalog.findById(service.id))!.media.map((m) => m.id)).toEqual([b.id, a.id]);

    expect(await failureCode(reorder.execute({ ...actor, serviceId: service.id, orderedIds: [b.id] }))).toBe(
      'SERVICE_ORDER_INVALID',
    );
  });
});
