// src/infrastructure/email/DeferredEmailProvider.ts
import { after } from 'next/server';
import type { EmailPayload, EmailProvider } from '@/domain/shared/EmailProvider';

/**
 * Décorateur d'EmailProvider : l'envoi part APRÈS que la réponse a été renvoyée au visiteur (`after()` de Next.js).
 *
 * Pourquoi : un email de rendez-vous est « au mieux » (son échec n'annule rien, voir `EmailProvider.send`), mais le
 * visiteur, lui, attendait quand même la fin de l'appel au fournisseur : deux envois à la suite, donc la durée de la
 * réservation dépendait de la latence de Resend, voire de sa disponibilité. Le rendez-vous est déjà enregistré quand
 * le use case envoie ses emails : rien ne justifie de faire patienter l'écran de confirmation.
 *
 * À utiliser uniquement dans une requête (Server Action, route) : `after()` n'existe pas en dehors.
 * Ne convient PAS à un email qui EST l'opération (`ReliableEmailSender`) : son échec doit pouvoir être signalé.
 */
export class DeferredEmailProvider implements EmailProvider {
  constructor(private readonly inner: EmailProvider) {}

  async send(payload: EmailPayload): Promise<void> {
    after(() => this.inner.send(payload));
  }
}
