// src/infrastructure/email/AppointmentEmailContext.ts
import type { AppointmentLocale } from '@/domain/appointment/AppointmentLocale';

/**
 * Ce qu'un email de rendez-vous affiche ou contient et que le use case n'a pas à fournir :
 * le jeton des liens, le créneau actuel et le nom du service dans la langue du destinataire.
 */
export type AppointmentEmailContext = {
  accessToken: string;
  slot: { date: string; startTime: string; endTime: string };
  serviceName: string;
  subServiceName: string | null;
};

export interface AppointmentEmailContextResolver {
  /** `null` si le rendez-vous est introuvable : l'email part alors sans détails ni liens plutôt que de ne pas partir. */
  resolve(appointmentId: string, locale: AppointmentLocale): Promise<AppointmentEmailContext | null>;
}
