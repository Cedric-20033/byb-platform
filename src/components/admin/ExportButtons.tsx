// src/components/admin/ExportButtons.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { exportAppointmentsAction } from '@/app/actions/admin/appointments';
import type { AppointmentExportRow } from '@/application/admin/ExportAppointments';
import type { AppointmentSearchFiltersValues } from '@/lib/validation/appointment';
import type { Service } from '@/types';
import type { Locale } from '@/lib/routing';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { formatInstant, todayInBrussels } from '@/lib/date';
import { t as translateField } from '@/lib/utils';
import { useErrorMessage } from '@/lib/useErrorMessage';

interface ExportButtonsProps {
  filters: AppointmentSearchFiltersValues;
  /** Catalogue des services : sert à exporter des noms lisibles plutôt que des identifiants. */
  services: Service[];
  locale: Locale;
}

/**
 * Composant pour les boutons d'exportation (CSV / Excel).
 * Les en-têtes, les statuts et les noms de services suivent la langue active.
 */
export function ExportButtons({ filters, services, locale }: ExportButtonsProps) {
  const t = useTranslations('admin.appointments');
  const tColumns = useTranslations('admin.appointments.exportColumns');
  const errorMessage = useErrorMessage();
  const [format, setFormat] = useState<'csv' | 'excel' | null>(null);

  const statusLabels: Record<string, string> = {
    [AppointmentStatus.PENDING]: t('statusPending'),
    [AppointmentStatus.CONFIRMED]: t('statusConfirmed'),
    [AppointmentStatus.CANCELLED]: t('statusCancelled'),
  };

  /** Aplatit une ligne exportée en objet aux en-têtes lisibles pour le tableur. */
  function toSheetRow(row: AppointmentExportRow) {
    const service = services.find((s) => s.id === row.serviceId);
    const subService = service?.subServices.find((s) => s.id === row.subServiceId);

    return {
      [tColumns('client')]: row.clientName,
      [tColumns('email')]: row.clientEmail,
      [tColumns('phone')]: row.clientPhone,
      [tColumns('service')]: service ? translateField(service.name, locale) : row.serviceId,
      [tColumns('subService')]: subService ? translateField(subService.name, locale) : '',
      // Date du créneau laissée au format ISO : triable et reconnu comme date par les tableurs.
      [tColumns('date')]: row.slotDate,
      [tColumns('startTime')]: row.slotStartTime,
      [tColumns('endTime')]: row.slotEndTime,
      [tColumns('status')]: statusLabels[row.status] ?? row.status,
      [tColumns('notes')]: row.notes ?? '',
      [tColumns('bookedOn')]: formatInstant(row.createdAt, locale, { dateStyle: 'short', timeStyle: 'short' }),
    };
  }

  async function handleExport(target: 'csv' | 'excel') {
    setFormat(target);
    try {
      const result = await exportAppointmentsAction(filters);
      if (!result.success) {
        toast.error(errorMessage(result.error));
        return;
      }
      if (result.rows.length === 0) {
        toast.info(t('noResults'));
        return;
      }

      // Import à la demande : la bibliothèque de tableur est lourde et ne sert qu'au clic sur Exporter.
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(result.rows.map(toSheetRow));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, tColumns('sheetName'));

      const fileName = `${tColumns('fileName')}-${todayInBrussels()}`;
      if (target === 'csv') {
        XLSX.writeFile(workbook, `${fileName}.csv`);
      } else {
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      }
    } finally {
      setFormat(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" isLoading={format === 'csv'} onClick={() => handleExport('csv')} className="normal-case font-medium tracking-normal">
        <FileText size={16} />
        {format === 'csv' ? t('exporting') : t('exportCsv')}
      </Button>
      <Button variant="outline" size="sm" isLoading={format === 'excel'} onClick={() => handleExport('excel')} className="normal-case font-medium tracking-normal">
        <FileSpreadsheet size={16} />
        {format === 'excel' ? t('exporting') : t('exportExcel')}
      </Button>
    </div>
  );
}
