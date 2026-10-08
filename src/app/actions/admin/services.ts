'use server';

// src/app/actions/admin/services.ts
import { ArchiveService, RestoreService } from '@/application/services/SetServiceActive';
import { CreateService } from '@/application/services/CreateService';
import { CreateSubService } from '@/application/services/CreateSubService';
import { DeleteService } from '@/application/services/DeleteService';
import { DeleteSubService } from '@/application/services/DeleteSubService';
import { ListServices } from '@/application/services/ListServices';
import { ReorderServices } from '@/application/services/ReorderServices';
import { ReorderSubServices } from '@/application/services/ReorderSubServices';
import { UpdateService } from '@/application/services/UpdateService';
import { UpdateSubService } from '@/application/services/UpdateSubService';
import type { CatalogService, CatalogSubService } from '@/domain/service/CatalogService';
import { revalidateCatalog } from '@/lib/cache/revalidateCatalog';
import { createCatalogDeps } from '@/lib/catalog/catalogComposition';
import { assertPermission, getCurrentAdmin, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import {
  createServiceSchema,
  createSubServiceSchema,
  reorderServicesSchema,
  reorderSubServicesSchema,
  serviceIdSchema,
  subServiceIdSchema,
  updateServiceSchema,
  updateSubServiceSchema,
} from '@/lib/validation/services';

/**
 * Server Actions du catalogue (services et sous-prestations). Chaque mutation :
 * Zod → getCurrentAdmin → assertPermission → use case → revalidation du site public.
 * `CatalogService` est un objet plat (aucune classe) : il traverse la frontière client telle quelle.
 */
type ListResult = { success: true; services: CatalogService[] } | ActionFailure;
type ServiceResult = { success: true; service: CatalogService } | ActionFailure;
type SubServiceResult = { success: true; subService: CatalogSubService } | ActionFailure;
type VoidResult = { success: true } | ActionFailure;

export async function listServicesAction(): Promise<ListResult> {
  try {
    assertPermission(await getCurrentAdmin(), 'services', 'view');

    const deps = await createCatalogDeps();
    return { success: true, services: await new ListServices(deps.services).execute() };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function createServiceAction(input: unknown): Promise<ServiceResult> {
  try {
    const parsed = createServiceSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'create');

    const deps = await createCatalogDeps();
    const service = await new CreateService(deps.services, deps.audit).execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true, service };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function updateServiceAction(input: unknown): Promise<ServiceResult> {
  try {
    const parsed = updateServiceSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'edit');

    const deps = await createCatalogDeps();
    const service = await new UpdateService(deps.services, deps.audit).execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true, service };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function archiveServiceAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = serviceIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'edit');

    const deps = await createCatalogDeps();
    await new ArchiveService(deps.services, deps.audit).execute({
      serviceId: parsed.data.serviceId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function restoreServiceAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = serviceIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'edit');

    const deps = await createCatalogDeps();
    await new RestoreService(deps.services, deps.audit).execute({
      serviceId: parsed.data.serviceId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function deleteServiceAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = serviceIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'delete');

    const deps = await createCatalogDeps();
    await new DeleteService(deps.services, deps.usage, deps.uploader, deps.audit).execute({
      serviceId: parsed.data.serviceId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function reorderServicesAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = reorderServicesSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'edit');

    const deps = await createCatalogDeps();
    await new ReorderServices(deps.services, deps.audit).execute({
      orderedIds: parsed.data.orderedIds,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function createSubServiceAction(input: unknown): Promise<SubServiceResult> {
  try {
    const parsed = createSubServiceSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'create');

    const deps = await createCatalogDeps();
    const subService = await new CreateSubService(deps.services, deps.subServices, deps.audit).execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true, subService };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function updateSubServiceAction(input: unknown): Promise<SubServiceResult> {
  try {
    const parsed = updateSubServiceSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'edit');

    const deps = await createCatalogDeps();
    const subService = await new UpdateSubService(deps.subServices, deps.audit).execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true, subService };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function deleteSubServiceAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = subServiceIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'delete');

    const deps = await createCatalogDeps();
    await new DeleteSubService(deps.services, deps.subServices, deps.audit).execute({
      subServiceId: parsed.data.subServiceId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateCatalog();
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function reorderSubServicesAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = reorderSubServicesSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'services', 'edit');

    const deps = await createCatalogDeps();
    await new ReorderSubServices(deps.services, deps.subServices, deps.audit).execute({
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
