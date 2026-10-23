// src/components/ui/linkButtonClasses.ts

/**
 * Habillage d'un lien (`<a>`) pour qu'il ressemble à `Button` : une navigation n'est pas une action, elle doit
 * rester un lien, et un `<button>` ne peut pas être placé dans un `<a>` (HTML invalide, double arrêt clavier).
 */
export const LINK_BUTTON_CLASSES =
  'inline-flex items-center justify-center px-6 py-3 rounded-[var(--radius-md)] font-[var(--font-display)] font-bold uppercase tracking-wide text-base transition-all duration-200 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2';
