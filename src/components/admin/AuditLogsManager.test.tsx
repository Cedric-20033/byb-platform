// @vitest-environment jsdom
// src/components/admin/AuditLogsManager.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { buildAuditLogEntry } from '@/test/fixtures/buildAuditLogEntry';

// Les Server Actions importent du code serveur (cookies, Supabase) : on les remplace par des doublures.
const listAuditLogsAction = vi.hoisted(() => vi.fn());
const exportAuditLogsAction = vi.hoisted(() => vi.fn());
vi.mock('@/app/actions/admin/auditLogs', () => ({ listAuditLogsAction, exportAuditLogsAction }));

const downloadTextFile = vi.hoisted(() => vi.fn());
vi.mock('@/lib/downloadTextFile', () => ({ downloadTextFile }));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

// Droit d'export piloté par chaque test, sans monter tout le fournisseur de permissions.
const permissions = vi.hoisted(() => ({ canExport: true }));
vi.mock('@/components/admin/Can', () => ({
  Can: ({ children }: { children: ReactNode }) => (permissions.canExport ? <>{children}</> : null),
}));

import { AuditLogsManager } from './AuditLogsManager';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));

function renderManager() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="fr" messages={messages}>
        <AuditLogsManager />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const page = (entries: ReturnType<typeof buildAuditLogEntry>[], nextCursor: string | null = null) => ({
  success: true as const,
  entries,
  nextCursor,
});

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  permissions.canExport = true;
  listAuditLogsAction.mockReset();
  exportAuditLogsAction.mockReset();
  downloadTextFile.mockReset();
});

afterEach(cleanup);

describe('AuditLogsManager', () => {
  it('affiche l’état vide', async () => {
    listAuditLogsAction.mockResolvedValue(page([]));
    renderManager();

    expect(await screen.findByText(messages.admin.auditLogs.empty)).toBeTruthy();
  });

  it('affiche les entrées avec le libellé de l’action et signale la fin du journal', async () => {
    listAuditLogsAction.mockResolvedValue(
      page([buildAuditLogEntry(1, { action: AuditAction.SLOT_BLOCKED, actorName: 'Alice', actorId: ACTOR_ID })]),
    );
    renderManager();

    const actor = await screen.findByRole('button', { name: 'Alice' });
    const row = actor.closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLTableRowElement).getByText(messages.admin.auditLogs.actions.SLOT_BLOCKED)).toBeTruthy();
    expect(screen.getByText(messages.admin.auditLogs.endOfLog)).toBeTruthy();
  });

  it('charge la page suivante avec le curseur renvoyé par le serveur', async () => {
    listAuditLogsAction
      .mockResolvedValueOnce(page([buildAuditLogEntry(2)], 'CURSEUR'))
      .mockResolvedValueOnce(page([buildAuditLogEntry(1, { action: AuditAction.HOLIDAY_CREATED })]));
    renderManager();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: messages.admin.auditLogs.loadMore }));

    await waitFor(() => expect(listAuditLogsAction).toHaveBeenCalledTimes(2));
    expect(listAuditLogsAction).toHaveBeenLastCalledWith({ filters: {}, cursor: 'CURSEUR' });
    const row = screen.getAllByRole('row').at(-1);
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText(messages.admin.auditLogs.actions.HOLIDAY_CREATED)).toBeTruthy();
  });

  it('filtre par auteur au clic et affiche la pastille retirable', async () => {
    listAuditLogsAction.mockResolvedValue(
      page([buildAuditLogEntry(1, { actorId: ACTOR_ID, actorName: 'Alice', actorRole: ActorRole.ADMIN })]),
    );
    renderManager();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Alice' }));

    await waitFor(() =>
      expect(listAuditLogsAction).toHaveBeenLastCalledWith({ filters: { actorId: ACTOR_ID }, cursor: null }),
    );
    expect(await screen.findByRole('button', { name: messages.admin.auditLogs.filters.removeActor })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: messages.admin.auditLogs.filters.removeActor }));
    await waitFor(() => expect(listAuditLogsAction).toHaveBeenLastCalledWith({ filters: {}, cursor: null }));
  });

  it('bloque la recherche quand le début de période suit la fin', async () => {
    listAuditLogsAction.mockResolvedValue(page([]));
    renderManager();
    const user = userEvent.setup();
    await screen.findByText(messages.admin.auditLogs.empty);

    await user.type(screen.getByLabelText(messages.admin.auditLogs.filters.dateFrom), '2026-10-10');
    await user.type(screen.getByLabelText(messages.admin.auditLogs.filters.dateTo), '2026-10-01');

    expect(await screen.findByText(messages.admin.auditLogs.filters.invalidPeriod)).toBeTruthy();
    const apply = screen.getByRole('button', { name: messages.admin.auditLogs.filters.apply });
    expect((apply as HTMLButtonElement).disabled).toBe(true);
  });

  it('affiche l’erreur serveur traduite et permet de réessayer', async () => {
    listAuditLogsAction.mockResolvedValueOnce({ success: false, error: 'FORBIDDEN' });
    renderManager();

    expect(await screen.findByRole('alert')).toBeTruthy();
    listAuditLogsAction.mockResolvedValueOnce(page([]));
    await userEvent.setup().click(screen.getByRole('button', { name: messages.admin.auditLogs.retry }));

    expect(await screen.findByText(messages.admin.auditLogs.empty)).toBeTruthy();
  });

  it('exporte en CSV avec les filtres appliqués', async () => {
    listAuditLogsAction.mockResolvedValue(page([buildAuditLogEntry(1)]));
    exportAuditLogsAction.mockResolvedValue({ success: true, entries: [buildAuditLogEntry(1)], truncated: false });
    renderManager();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: messages.admin.auditLogs.export.csv }));

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));
    expect(exportAuditLogsAction).toHaveBeenCalledWith({ filters: {} });
    const [fileName, content, mime] = downloadTextFile.mock.calls[0];
    expect(fileName).toMatch(/\.csv$/);
    expect(mime).toBe('text/csv');
    expect(content).toContain('SLOT_BLOCKED');
  });

  it('masque le bouton d’export sans la permission audit_logs.export', async () => {
    permissions.canExport = false;
    listAuditLogsAction.mockResolvedValue(page([buildAuditLogEntry(1)]));
    renderManager();

    await screen.findByText(messages.admin.auditLogs.actions.SLOT_BLOCKED);
    expect(screen.queryByRole('button', { name: messages.admin.auditLogs.export.csv })).toBeNull();
  });
});
