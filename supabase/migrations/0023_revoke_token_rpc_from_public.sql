-- supabase/migrations/0023_revoke_token_rpc_from_public.sql
--
-- Ferme l'accès public aux deux fonctions « par jeton » de la migration 0001 (revue de sécurité P9.4).
--
-- Depuis P5.2, le site ne les appelle plus : le code serveur retrouve le rendez-vous par son `access_token`
-- avec la clé service_role (SupabaseClientAppointmentAccess), puis les use cases font le travail (statut,
-- libération du créneau, emails, audit). Les laisser exécutables par `anon` et `authenticated` n'apporte rien
-- et expose un contournement :
--   - `cancel_appointment_by_token` annule un rendez-vous SANS trace d'audit, SANS email au client, SANS
--     notification de l'équipe et sans contrôle de limitation de débit, avec un simple jeton valide ;
--   - `get_appointment_by_token` n'est plus exposée à la limitation de débit des actions publiques.
--
-- Le privilège EXECUTE est retiré à PUBLIC (accordé par défaut à la création), à `anon` et à `authenticated`
-- (accordés explicitement par la 0001 et par les privilèges par défaut de Supabase). Il reste au service_role,
-- le code serveur : la mesure est réversible d'un simple GRANT, et les fonctions ne sont pas supprimées.
--
-- Instructions idempotentes.

revoke all on function public.get_appointment_by_token(uuid) from public, anon, authenticated;
revoke all on function public.cancel_appointment_by_token(uuid) from public, anon, authenticated;

grant execute on function public.get_appointment_by_token(uuid) to service_role;
grant execute on function public.cancel_appointment_by_token(uuid) to service_role;
