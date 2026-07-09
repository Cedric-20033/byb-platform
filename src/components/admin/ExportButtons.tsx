// src/components/admin/ExportButtons.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/Button';
import { exportAppointmentsAction } from '@/app/actions/admin/appointments';
import type { AppointmentExportRow } from '@/application/admin/ExportAppointments';
import type { AppointmentSearchFiltersValues } from '@/lib/validation/appointment';

interface ExportButtonsProps {
  filters: AppointmentSearchFiltersValues;
}

/** Aplati chaque ligne exportée en un objet aux en-têtes lisibles pour le tableur. */
function toSheetRow(row: AppointmentExportRow) {
  return {
    Client: row.clientName,
    Email: row.clientEmail,
    Téléphone: row.clientPhone,
    Service: row.serviceId,
    Date: row.slotDate,
    'Heure début': row.slotStartTime,
    'Heure fin': row.slotEndTime,
    Statut: row.status,
    'Réservé le': row.createdAt,
  };
}

/**
 * Composant pour les boutons d'exportation.
 * @param param0 
 * @returns 
 */
export function ExportButtons({ filters }: ExportButtonsProps) {
  const t = useTranslations('admin.appointments');
  const [format, setFormat] = useState<'csv' | 'excel' | null>(null);

  async function handleExport(target: 'csv' | 'excel') {
    setFormat(target);
    try {
      const result = await exportAppointmentsAction(filters);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.rows.length === 0) {
        toast.info(t('noResults'));
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(result.rows.map(toSheetRow));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rendez-vous');

      const fileName = `rendez-vous-${new Date().toISOString().slice(0, 10)}`;
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
