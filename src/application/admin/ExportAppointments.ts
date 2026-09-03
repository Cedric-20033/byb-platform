// src/application/admin/ExportAppointments.ts
import type {
  AppointmentRepository,
  AppointmentSearchFilters,
} from '@/domain/appointment/AppointmentRepository';
import type { AuditLogger } from '@/domain/shared/AuditLogger';
import { AuditAction } from '@/domain/shared/AuditLogger';
import type { ActorRole } from '@/domain/shared/AuditLogger';

export type ExportAppointmentsInput = {
  filters: AppointmentSearchFilters;
  actorId: string;
  actorRole: ActorRole;
};

/**
 * Ligne exportable — format plat, sans méthodes, prêt à être transformé en
 * feuille Excel/CSV. La génération du fichier binaire (librairie `xlsx`) est
 * un détail technique : elle reste dans le composition root (src/app/), pas ici.
 */
export type AppointmentExportRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceId: string;
  subServiceId: string | null;
  notes: string | null;
  status: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  createdAt: string;
};

/**
 * Use case : prépare les données de RDV à exporter selon les filtres admin.
 * Ne produit pas le fichier lui-même — seulement les données métier.
 */
export class ExportAppointments {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: ExportAppointmentsInput): Promise<AppointmentExportRow[]> {
    const results = await this.appointmentRepository.searchWithSlot(input.filters);

    const rows: AppointmentExportRow[] = results.map(({ appointment, slotDate, slotStartTime, slotEndTime }) => ({
      id: appointment.id,
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhone: appointment.clientPhone,
      serviceId: appointment.serviceId,
      subServiceId: appointment.subServiceId,
      notes: appointment.notes,
      status: appointment.status,
      slotDate,
      slotStartTime,
      slotEndTime,
      createdAt: appointment.createdAt.toISOString(),
    }));

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.EXPORT_GENERATED,
      targetType: 'appointment',
      targetId: null,
      metadata: { count: rows.length, filters: input.filters },
    });

    return rows;
  }
}
