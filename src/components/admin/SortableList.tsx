// src/components/admin/SortableList.tsx
'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortableListProps<T> = {
  items: T[];
  getId: (item: T) => string;
  /** Reçoit la liste complète dans son nouvel ordre. */
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  /** Désactive le tri (ex. liste filtrée : un ordre partiel n'aurait pas de sens). */
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
};

/** Déplace l'élément `from` à la position `to` sans muter le tableau d'origine. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Liste réordonnable. Le glisser-déposer natif HTML5 suffit pour la souris ; les boutons
 * monter/descendre sont l'alternative clavier et tactile (le glisser-déposer natif n'existe
 * pas sur mobile), ce qui évite d'ajouter une dépendance.
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  disabled = false,
  className,
  itemClassName,
}: SortableListProps<T>) {
  const t = useTranslations('admin.catalog');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }

  function drop(to: number) {
    if (dragIndex !== null) onReorder(moveItem(items, dragIndex, to));
    endDrag();
  }

  return (
    <ul className={className}>
      {items.map((item, index) => (
        <li
          key={getId(item)}
          draggable={!disabled}
          onDragStart={(event) => {
            setDragIndex(index);
            event.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(event) => {
            if (dragIndex === null) return;
            event.preventDefault();
            setOverIndex(index);
          }}
          onDrop={(event) => {
            event.preventDefault();
            drop(index);
          }}
          onDragEnd={endDrag}
          className={cn(
            'flex items-center gap-2',
            dragIndex === index && 'opacity-40',
            overIndex === index && dragIndex !== index && 'ring-2 ring-[var(--color-primary)]',
            itemClassName,
          )}
        >
          {!disabled && (
            <div className="flex flex-col items-center shrink-0 text-[var(--color-muted)]">
              <button
                type="button"
                aria-label={t('moveUp')}
                disabled={index === 0}
                onClick={() => onReorder(moveItem(items, index, index - 1))}
                className="p-0.5 hover:text-[var(--color-foreground)] disabled:opacity-30"
              >
                <ArrowUp size={14} />
              </button>
              <GripVertical size={16} aria-hidden className="cursor-grab" />
              <button
                type="button"
                aria-label={t('moveDown')}
                disabled={index === items.length - 1}
                onClick={() => onReorder(moveItem(items, index, index + 1))}
                className="p-0.5 hover:text-[var(--color-foreground)] disabled:opacity-30"
              >
                <ArrowDown size={14} />
              </button>
            </div>
          )}
          <div className="flex-1 min-w-0">{renderItem(item, index)}</div>
        </li>
      ))}
    </ul>
  );
}
