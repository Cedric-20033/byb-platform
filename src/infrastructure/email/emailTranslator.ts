// src/infrastructure/email/emailTranslator.ts
import { createTranslator } from 'next-intl';
import type { AppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import de from '../../../messages/de.json';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';

/** Seul l'espace de noms `emails` est embarqué : les emails ne lisent rien d'autre des fichiers de messages. */
const MESSAGES = {
  fr: { emails: fr.emails },
  en: { emails: en.emails },
  de: { emails: de.emails },
} satisfies Record<AppointmentLocale, unknown>;

export type EmailTranslator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Traducteur utilisable hors requête (un email est composé côté serveur, sans locale de requête).
 * Mêmes fichiers `messages/*.json` et même syntaxe ICU que l'interface : une seule source de traductions.
 * Les clés sont relatives à l'espace `emails` (ex. « appointmentConfirmation.subject »).
 */
export function createEmailTranslator(locale: AppointmentLocale): EmailTranslator {
  const translator = createTranslator({ locale, messages: MESSAGES[locale], namespace: 'emails' });
  // next-intl type les clés d'après les messages déclarés globalement ; ici elles sont dynamiques.
  return translator as unknown as EmailTranslator;
}
