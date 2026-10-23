'use server';

// src/app/actions/admin/testimonials.ts
import { CreateTestimonial } from '@/application/testimonials/CreateTestimonial';
import { DeleteTestimonial } from '@/application/testimonials/DeleteTestimonial';
import { ListTestimonials } from '@/application/testimonials/ListTestimonials';
import { ReorderTestimonials } from '@/application/testimonials/ReorderTestimonials';
import { PublishTestimonial, UnpublishTestimonial } from '@/application/testimonials/SetTestimonialPublished';
import { UpdateTestimonial } from '@/application/testimonials/UpdateTestimonial';
import type { TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';
import { revalidateTestimonials } from '@/lib/cache/revalidateTestimonials';
import { assertPermission, getCurrentAdmin, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import { createTestimonialDeps } from '@/lib/testimonials/testimonialsComposition';
import {
  createTestimonialSchema,
  reorderTestimonialsSchema,
  testimonialIdSchema,
  updateTestimonialSchema,
} from '@/lib/validation/testimonials';

/**
 * Server Actions des témoignages. Chaque mutation : Zod → getCurrentAdmin → assertPermission → use case →
 * revalidation du site public. Permissions alignées sur la RLS de 0020 : ajouter = create,
 * modifier/publier/trier = edit, supprimer = delete.
 */
type ListResult = { success: true; testimonials: TestimonialRecord[] } | ActionFailure;
type TestimonialResult = { success: true; testimonial: TestimonialRecord } | ActionFailure;
type VoidResult = { success: true } | ActionFailure;

export async function listTestimonialsAction(): Promise<ListResult> {
  try {
    assertPermission(await getCurrentAdmin(), 'testimonials', 'view');

    const deps = await createTestimonialDeps();
    return { success: true, testimonials: await new ListTestimonials(deps.testimonials).execute() };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function createTestimonialAction(input: unknown): Promise<TestimonialResult> {
  try {
    const parsed = createTestimonialSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'testimonials', 'create');

    const deps = await createTestimonialDeps();
    const testimonial = await new CreateTestimonial(deps.testimonials, deps.audit).execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateTestimonials();
    return { success: true, testimonial };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function updateTestimonialAction(input: unknown): Promise<TestimonialResult> {
  try {
    const parsed = updateTestimonialSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'testimonials', 'edit');

    const deps = await createTestimonialDeps();
    const testimonial = await new UpdateTestimonial(deps.testimonials, deps.audit).execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateTestimonials();
    return { success: true, testimonial };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function publishTestimonialAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = testimonialIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'testimonials', 'edit');

    const deps = await createTestimonialDeps();
    await new PublishTestimonial(deps.testimonials, deps.audit).execute({
      testimonialId: parsed.data.testimonialId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateTestimonials();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function unpublishTestimonialAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = testimonialIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'testimonials', 'edit');

    const deps = await createTestimonialDeps();
    await new UnpublishTestimonial(deps.testimonials, deps.audit).execute({
      testimonialId: parsed.data.testimonialId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateTestimonials();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function deleteTestimonialAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = testimonialIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'testimonials', 'delete');

    const deps = await createTestimonialDeps();
    await new DeleteTestimonial(deps.testimonials, deps.audit).execute({
      testimonialId: parsed.data.testimonialId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateTestimonials();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function reorderTestimonialsAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = reorderTestimonialsSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'testimonials', 'edit');

    const deps = await createTestimonialDeps();
    await new ReorderTestimonials(deps.testimonials, deps.audit).execute({
      orderedIds: parsed.data.orderedIds,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateTestimonials();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
