// src/domain/contact/ContactMessage.ts

/**
 * Message écrit par un visiteur via le formulaire de contact. Jamais conservé en base : il est transmis par
 * email à l'équipe, qui y répond directement (voir `SubmitContactMessage`).
 */
export type ContactMessage = {
  firstName: string;
  lastName: string;
  /** En minuscules, sans espaces autour. */
  email: string;
  phone: string | null;
  /** Une seule ligne : l'objet d'un email ne peut contenir aucun saut de ligne. */
  subject: string;
  message: string;
};
