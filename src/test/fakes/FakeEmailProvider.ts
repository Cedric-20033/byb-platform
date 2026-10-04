// src/test/fakes/FakeEmailProvider.ts
import type { EmailPayload, EmailProvider } from '@/domain/shared/EmailProvider';

/** Enregistre les emails au lieu de les envoyer : les tests vérifient `sent`. */
export class FakeEmailProvider implements EmailProvider {
  readonly sent: EmailPayload[] = [];

  async send(payload: EmailPayload): Promise<void> {
    this.sent.push(payload);
  }
}
