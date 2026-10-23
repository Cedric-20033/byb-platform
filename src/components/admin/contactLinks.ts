// src/components/admin/contactLinks.ts

/** Lien `mailto:` vers un client. L'adresse est encodée : elle vient d'un formulaire public. */
export function toMailtoHref(email: string): string {
  return `mailto:${encodeURIComponent(email.trim())}`;
}

/**
 * Lien `tel:` vers un client.
 * Le numéro est saisi librement (espaces, points, tirets) ; les clients téléphoniques n'acceptent
 * que les chiffres et un « + » initial, le reste est retiré.
 */
export function toTelHref(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  return `tel:${trimmed.startsWith('+') ? '+' : ''}${digits}`;
}
