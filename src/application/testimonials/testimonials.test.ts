// src/application/testimonials/testimonials.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { DomainError, type DomainErrorCode } from '@/domain/shared/DomainError';
import type { TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { InMemoryTestimonialRepository } from '@/test/fakes/InMemoryTestimonialRepository';
import { CreateTestimonial } from './CreateTestimonial';
import { DeleteTestimonial } from './DeleteTestimonial';
import { GetPublishedTestimonials } from './GetPublishedTestimonials';
import { ReorderTestimonials } from './ReorderTestimonials';
import { PublishTestimonial, UnpublishTestimonial } from './SetTestimonialPublished';
import { UpdateTestimonial } from './UpdateTestimonial';

const actor = { actorId: 'admin-1', actorRole: ActorRole.ADMIN };

/** Échec attendu d'un use case : renvoie son code métier, ou `null` si rien n'a été levé. */
async function failureCode(promise: Promise<unknown>): Promise<DomainErrorCode | 'OTHER' | null> {
  try {
    await promise;
  } catch (error) {
    return error instanceof DomainError ? error.code : 'OTHER';
  }
  return null;
}

let repository: InMemoryTestimonialRepository;
let audit: FakeAuditLogger;

beforeEach(() => {
  repository = new InMemoryTestimonialRepository();
  audit = new FakeAuditLogger();
});

const input = (authorName: string, overrides: { rating?: number; authorLocation?: string } = {}) => ({
  authorName,
  authorLocation: overrides.authorLocation ?? 'Liège',
  content: { fr: `Avis de ${authorName}` },
  rating: overrides.rating ?? 5,
  date: '2024-10-15',
});

const create = (authorName: string, overrides: { rating?: number; authorLocation?: string } = {}) =>
  new CreateTestimonial(repository, audit).execute({ ...actor, ...input(authorName, overrides) });

describe('CreateTestimonial', () => {
  it('crée un témoignage en BROUILLON, en fin de liste, sans avatar', async () => {
    await create('A');
    const second = await create('B');

    expect(second.isPublished).toBe(false);
    expect(second.order).toBe(1);
    expect(second.avatarPublicId).toBeNull();
  });

  it('retire les espaces autour du nom et de la ville', async () => {
    const created = await create('  Marc Lefebvre  ', { authorLocation: '  Hasselt ' });

    expect(created.authorName).toBe('Marc Lefebvre');
    expect(created.authorLocation).toBe('Hasselt');
  });

  it.each([0, 6, 3.5, Number.NaN])('refuse la note %s', async (rating) => {
    expect(await failureCode(create('A', { rating }))).toBe('TESTIMONIAL_RATING_INVALID');
    expect(repository.rows).toHaveLength(0);
  });

  it('trace la création', async () => {
    const created = await create('A');

    expect(audit.entries).toEqual([
      expect.objectContaining({ action: AuditAction.TESTIMONIAL_CREATED, targetType: 'testimonial', targetId: created.id }),
    ]);
  });
});

describe('UpdateTestimonial', () => {
  const update = (testimonial: TestimonialRecord, overrides: { rating?: number; authorName?: string } = {}) =>
    new UpdateTestimonial(repository, audit).execute({
      ...actor,
      testimonialId: testimonial.id,
      authorName: overrides.authorName ?? testimonial.authorName,
      authorLocation: testimonial.authorLocation,
      content: testimonial.content,
      rating: overrides.rating ?? testimonial.rating,
      date: testimonial.date,
    });

  it('journalise uniquement les champs modifiés', async () => {
    const created = await create('A');
    audit.entries.length = 0;

    await update(created, { rating: 4 });

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0].metadata).toEqual({ changedFields: ['rating'] });
  });

  it('ne trace rien quand rien ne change', async () => {
    const created = await create('A');
    audit.entries.length = 0;

    await update(created);

    expect(audit.entries).toHaveLength(0);
  });

  it('refuse une note invalide sans rien écrire', async () => {
    const created = await create('A');

    expect(await failureCode(update(created, { rating: 9 }))).toBe('TESTIMONIAL_RATING_INVALID');
    expect((await repository.findById(created.id))!.rating).toBe(5);
  });

  it('refuse un témoignage inconnu', async () => {
    const ghost = { ...(await create('A')), id: 'ghost' };
    expect(await failureCode(update(ghost))).toBe('TESTIMONIAL_NOT_FOUND');
  });
});

describe('PublishTestimonial / UnpublishTestimonial', () => {
  it('publie puis dépublie, en traçant chaque changement', async () => {
    const created = await create('A');
    audit.entries.length = 0;

    await new PublishTestimonial(repository, audit).execute({ ...actor, testimonialId: created.id });
    expect((await repository.findById(created.id))!.isPublished).toBe(true);

    await new UnpublishTestimonial(repository, audit).execute({ ...actor, testimonialId: created.id });
    expect((await repository.findById(created.id))!.isPublished).toBe(false);
    expect(audit.entries.map((entry) => entry.metadata)).toEqual([{ isPublished: true }, { isPublished: false }]);
  });

  it('est idempotent : republier un avis publié ne trace rien', async () => {
    const created = await create('A');
    await new PublishTestimonial(repository, audit).execute({ ...actor, testimonialId: created.id });
    audit.entries.length = 0;

    await new PublishTestimonial(repository, audit).execute({ ...actor, testimonialId: created.id });

    expect(audit.entries).toHaveLength(0);
  });

  it('refuse un témoignage inconnu', async () => {
    expect(
      await failureCode(new PublishTestimonial(repository, audit).execute({ ...actor, testimonialId: 'ghost' })),
    ).toBe('TESTIMONIAL_NOT_FOUND');
  });
});

describe('ReorderTestimonials', () => {
  it('réordonne et trace une fois', async () => {
    const a = await create('A');
    const b = await create('B');
    audit.entries.length = 0;

    await new ReorderTestimonials(repository, audit).execute({ ...actor, orderedIds: [b.id, a.id] });

    expect((await repository.findAll()).map((item) => item.id)).toEqual([b.id, a.id]);
    expect(audit.entries).toHaveLength(1);
  });

  it('refuse un ordre périmé (un témoignage manque)', async () => {
    const a = await create('A');
    await create('B');

    expect(await failureCode(new ReorderTestimonials(repository, audit).execute({ ...actor, orderedIds: [a.id] }))).toBe(
      'TESTIMONIAL_ORDER_INVALID',
    );
  });

  it('ne trace rien quand l’ordre est inchangé', async () => {
    const a = await create('A');
    const b = await create('B');
    audit.entries.length = 0;

    await new ReorderTestimonials(repository, audit).execute({ ...actor, orderedIds: [a.id, b.id] });

    expect(audit.entries).toHaveLength(0);
  });
});

describe('DeleteTestimonial', () => {
  it('supprime le témoignage et garde un ordre contigu', async () => {
    const a = await create('A');
    const b = await create('B');
    const c = await create('C');

    await new DeleteTestimonial(repository, audit).execute({ ...actor, testimonialId: a.id });

    expect((await repository.findAll()).map((item) => [item.id, item.order])).toEqual([
      [b.id, 0],
      [c.id, 1],
    ]);
    expect(audit.entries.at(-1)?.action).toBe(AuditAction.TESTIMONIAL_DELETED);
  });
});

describe('GetPublishedTestimonials', () => {
  it('ne renvoie que les avis publiés, dans la forme du site public', async () => {
    const published = await create('Marc', { rating: 4 });
    await create('Brouillon');
    await new PublishTestimonial(repository, audit).execute({ ...actor, testimonialId: published.id });

    const result = await new GetPublishedTestimonials(repository).execute();

    expect(result).toEqual([
      {
        id: published.id,
        authorName: 'Marc',
        authorLocation: 'Liège',
        content: { fr: 'Avis de Marc' },
        rating: 4,
        date: '2024-10-15',
        avatarImage: undefined,
      },
    ]);
  });

  it('renvoie une liste vide quand rien n’est publié', async () => {
    await create('Brouillon');
    expect(await new GetPublishedTestimonials(repository).execute()).toEqual([]);
  });
});
