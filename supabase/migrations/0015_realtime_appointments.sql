-- supabase/migrations/0015_realtime_appointments.sql
--
-- Notifications admin en temps réel (P4.9) : la cloche et les listes se mettent à jour dès qu'un rendez-vous
-- est demandé, confirmé ou annulé, sans attendre le prochain rafraîchissement.
--
-- Supabase Realtime (`postgres_changes`) ne diffuse que les tables de la publication `supabase_realtime`.
-- Il applique la RLS : un admin ne reçoit que les rendez-vous qu'il a le droit de lire (appointments.view).
-- Rien à contourner ni à dupliquer côté droits.
--
-- Idempotent, et sans effet dans un environnement sans publication Realtime (base de test minimale).

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
         from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
     ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end;
$$;
