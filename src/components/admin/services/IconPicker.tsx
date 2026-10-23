// src/components/admin/services/IconPicker.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Axe,
  Brush,
  Construction,
  DoorOpen,
  Drill,
  Droplets,
  Fence,
  Flame,
  Hammer,
  HardHat,
  House,
  Layers,
  Lightbulb,
  PaintRoller,
  Paintbrush,
  Pickaxe,
  Plug,
  Ruler,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Sun,
  Thermometer,
  Triangle,
  Truck,
  Warehouse,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Icônes proposées, indexées par le nom STOCKÉ en base (nom Lucide). Liste volontairement
 * restreinte aux métiers du bâtiment : importer toute la bibliothèque alourdirait le bundle
 * pour un écran d'administration. `Home` est conservé tel quel pour les services déjà migrés.
 */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  Home: House,
  Triangle,
  Hammer,
  Wrench,
  PaintRoller,
  Paintbrush,
  Brush,
  Ruler,
  HardHat,
  Construction,
  Warehouse,
  Drill,
  Layers,
  Square,
  Droplets,
  Flame,
  Zap,
  Thermometer,
  Wind,
  Sun,
  ShieldCheck,
  Truck,
  Pickaxe,
  Axe,
  DoorOpen,
  Lightbulb,
  Plug,
  Settings,
  Sparkles,
  Fence,
};

type IconPickerProps = {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
};

export function IconPicker({ value, onChange, disabled = false }: IconPickerProps) {
  const t = useTranslations('admin.catalog.iconPicker');
  const [query, setQuery] = useState('');

  const names = Object.keys(SERVICE_ICONS).filter((name) => name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('search')}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
      />

      {names.length === 0 ? (
        <p className="text-xs text-[var(--color-muted)]">{t('none')}</p>
      ) : (
        <div role="radiogroup" className="grid grid-cols-6 sm:grid-cols-8 gap-2">
          {names.map((name) => {
            const Icon = SERVICE_ICONS[name];
            const selected = name === value;
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={name}
                title={name}
                disabled={disabled}
                onClick={() => onChange(name)}
                className={cn(
                  'flex items-center justify-center aspect-square rounded-[var(--radius-md)] border transition-colors',
                  selected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>
      )}

      {value && <p className="text-xs text-[var(--color-muted)]">{t('selected', { name: value })}</p>}
    </div>
  );
}
