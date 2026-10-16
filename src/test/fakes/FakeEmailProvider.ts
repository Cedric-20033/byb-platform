// src/test/fakes/FakeEmailProvider.ts
import { DomainError } from '@/domain/shared/DomainError';
import type { EmailPayload, EmailProvider, ReliableEmailSender } from '@/domain/shared/EmailProvider';

/** Enregistre les emails au lieu de les envoyer : les tests vérifient `sent`. */
export class FakeEmailProvider implements EmailProvider, ReliableEmailSender {
  readonly sent: EmailPayload[] = [];
  /** Quand vrai, `sendOrThrow` échoue comme le ferait un fournisseur en panne (`send`, au mieux, jamais). */
  failDelivery = false;

  async send(payload: EmailPayload): Promise<void> {
    this.sent.push(payload);
  }

  async sendOrThrow(payload: EmailPayload): Promise<void> {
    if (this.failDelivery) throw new DomainError('Fournisseur indisponible.', 'EMAIL_DELIVERY_FAILED');
    this.sent.push(payload);
  }
}
