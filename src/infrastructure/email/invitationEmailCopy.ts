// src/infrastructure/email/invitationEmailCopy.ts

type Locale = 'fr' | 'en' | 'de';

type InvitationCopy = {
  subject: string;
  greeting: (name: string) => string;
  body: string;
  cta: string;
  expiry: string;
};

/**
 * Textes de l'email d'invitation. Hors de `messages/*.json` à dessein :
 * ces fichiers sont chargés par next-intl dans le navigateur, alors qu'un
 * email est composé côté serveur sans contexte de requête localisée.
 */
export const INVITATION_COPY: Record<Locale, InvitationCopy> = {
  fr: {
    subject: 'Votre invitation au tableau de bord BYB',
    greeting: (name) => `Bonjour ${name},`,
    body: 'Vous avez été invité à rejoindre le tableau de bord. Cliquez sur le bouton ci-dessous pour choisir votre mot de passe.',
    cta: 'Activer mon compte',
    expiry: 'Ce lien est personnel et expire au bout d\'un certain temps. S\'il a expiré, demandez un nouvel envoi à un superadmin.',
  },
  en: {
    subject: 'Your invitation to the BYB dashboard',
    greeting: (name) => `Hello ${name},`,
    body: 'You have been invited to join the dashboard. Click the button below to choose your password.',
    cta: 'Activate my account',
    expiry: 'This link is personal and expires after a while. If it has expired, ask a superadmin to send a new one.',
  },
  de: {
    subject: 'Ihre Einladung zum BYB-Dashboard',
    greeting: (name) => `Guten Tag ${name},`,
    body: 'Sie wurden eingeladen, dem Dashboard beizutreten. Klicken Sie auf die Schaltfläche unten, um Ihr Passwort festzulegen.',
    cta: 'Konto aktivieren',
    expiry: 'Dieser Link ist persönlich und läuft nach einer gewissen Zeit ab. Ist er abgelaufen, bitten Sie einen Superadmin um einen neuen.',
  },
};
