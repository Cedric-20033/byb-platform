// src/lib/booking/clientAppointmentPageView.ts
import type { ClientAppointmentPageData } from './loadClientAppointmentPage';
import type { ClientAppointmentSummary } from './clientAppointmentSummary';

export type ClientAppointmentNoticeVariant = 'invalid' | 'rateLimited' | 'cancelled' | 'past';

/** Ce que la page affiche : le panneau d'action, ou un message qui explique pourquoi il n'y a rien à faire. */
export type ClientAppointmentPageView =
  | { type: 'actionable'; summary: ClientAppointmentSummary }
  | { type: 'notice'; variant: ClientAppointmentNoticeVariant; summary?: ClientAppointmentSummary };

/**
 * Décide quoi montrer. Un type de retour discriminé évite aux deux pages (annuler, modifier) de
 * recombiner `kind` et `state` : une seule table de décision, testée une fois.
 */
export function toClientAppointmentPageView(data: ClientAppointmentPageData): ClientAppointmentPageView {
  if (data.kind !== 'found') return { type: 'notice', variant: data.kind };
  if (data.state === 'active') return { type: 'actionable', summary: data.summary };
  return { type: 'notice', variant: data.state, summary: data.summary };
}
