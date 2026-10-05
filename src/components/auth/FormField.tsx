// src/components/auth/FormField.tsx
'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/**
 * Champ de formulaire accessible : le label est relié au champ (clic sur le
 * label, lecteurs d'écran, tests `getByLabel`), et l'erreur ou l'aide sont
 * annoncées via `aria-describedby`. Compatible avec `register()` de react-hook-form.
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, className, ...inputProps }, ref) => {
    const id = useId();
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
      <div>
        <label htmlFor={id} className="text-sm font-medium block mb-1">
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]',
            error && 'border-[var(--color-secondary)]',
            className,
          )}
          {...inputProps}
        />
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-xs text-[var(--color-secondary)] mt-1">
            {error}
          </p>
        ) : (
          hint && (
            <p id={`${id}-hint`} className="text-xs text-[var(--color-muted)] mt-1">
              {hint}
            </p>
          )
        )}
      </div>
    );
  },
);

FormField.displayName = 'FormField';
