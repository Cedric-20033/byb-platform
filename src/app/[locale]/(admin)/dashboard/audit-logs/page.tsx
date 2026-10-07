// src/app/[locale]/(admin)/dashboard/audit-logs/page.tsx
import { getTranslations } from 'next-intl/server';
import { AuditLogsManager } from '@/components/admin/AuditLogsManager';
import { requirePermission } from '@/lib/auth/requirePermission';

export default async function AuditLogsPage() {
  await requirePermission('audit_logs', 'view');
  const t = await getTranslations('admin.auditLogs');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <AuditLogsManager />
    </div>
  );
}
