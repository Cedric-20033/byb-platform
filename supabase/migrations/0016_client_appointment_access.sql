-- supabase/migrations/0016_client_appointment_access.sql
--
-- Accès d'un client à son rendez-vous par le lien de son email (P5.2, P5.3) et emails localisés (P5.4).
--
-- 1. `appointments.locale` : langue dans laquelle le client a réservé. Les emails envoyés plus tard
--    (confirmation par l'équipe, annulation, déplacement) doivent rester dans SA langue, pas celle de
--    l'admin qui déclenche l'action. Les rendez-vous existants et ceux créés par un admin restent en
--    français (valeur par défaut).
--
-- 2. Le déplacement par le client réutilise `reschedule_appointment` (0012), appelée avec la clé
--    service_role depuis la Server Action une fois le jeton vérifié. Le EXECUTE y est accordé
--    explicitement plutôt que de compter sur les privilèges par défaut de la plateforme.
--
-- Aucune nouvelle fonction de lecture par jeton : le code serveur lit `appointments.access_token`
-- directement avec la clé service_role ; une fonction SECURITY DEFINER n'ajouterait aucune barrière.
--
-- Instructions idempotentes.

alter table public.appointments
  add column if not exists locale text not null default 'fr'
  constraint appointments_locale_check check (locale in ('fr', 'en', 'de'));

grant execute on function public.reschedule_appointment(uuid, uuid) to service_role;
