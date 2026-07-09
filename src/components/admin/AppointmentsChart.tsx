// src/components/admin/AppointmentsChart.tsx
'use client';

import { useLocale } from 'next-intl';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DailyAppointmentCount } from '@/application/admin/GetDashboardStats';
import { Card } from '@/components/ui/Card';

interface AppointmentsChartProps {
  title: string;
  data: DailyAppointmentCount[];
}

/**
 * Graphique en aire des RDV des 14 derniers jours.
 * Client component isolé : recharts a besoin du DOM/ResizeObserver du navigateur.
 */
export function AppointmentsChart({ title, data }: AppointmentsChartProps) {
  const locale = useLocale();

  const chartData = data.map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(new Date(point.date)),
  }));

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold mb-4">{title}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="appointmentsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
              }}
            />
            <Area type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} fill="url(#appointmentsGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
