// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';
import { checkHealth } from '@/lib/health/checkHealth';

/** Jamais mise en cache : une sonde doit refléter l'état présent. */
export const dynamic = 'force-dynamic';

/**
 * Sonde de santé pour l'hébergeur et le HEALTHCHECK Docker : 200 si le site et la base répondent, 503 sinon.
 * Publique par nature : elle ne révèle que « ok » ou « down » par dépendance, sans détail technique.
 */
export async function GET() {
  const report = await checkHealth(async () => {
    const { error } = await createServiceRoleClient().from('services').select('id').limit(1);
    if (error) throw new Error(error.message);
  });

  return NextResponse.json(report, {
    status: report.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
