// src/components/admin/dashboard/ServiceActivityChart.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type ServiceActivityPoint = { name: string; count: number };

interface ServiceActivityChartProps {
  data: ServiceActivityPoint[];
  /** Libellé de la série (infobulle) et description accessible du graphique. */
  label: string;
}

const ROW_HEIGHT = 36;
const MIN_HEIGHT = 140;

/**
 * Barres horizontales : un service par ligne, ses noms pouvant être longs. Client component isolé,
 * recharts a besoin du DOM et de ResizeObserver du navigateur. La hauteur suit le nombre de services
 * pour garder des barres lisibles qu'il y en ait deux ou dix.
 */
export function ServiceActivityChart({ data, label }: ServiceActivityChartProps) {
  return (
    <div role="img" aria-label={label} style={{ height: Math.max(MIN_HEIGHT, data.length * ROW_HEIGHT) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-raised)' }}
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
            }}
          />
          <Bar dataKey="count" name={label} fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
