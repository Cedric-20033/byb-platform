-- supabase/migrations/0003_service_id_foreign_keys.sql
--
-- Corrige une incohérence structurelle : slots.service_id / appointments.service_id
-- étaient stockés en `text` et référençaient tantôt le slug du service
-- (scripts/seed-slots.ts), tantôt un ancien id statique "svc-00X"
-- (src/components/booking/steps/SlotStep.tsx et ConfirmationStep.tsx envoient
-- selectedService.id) — les deux valeurs ne coïncidaient jamais, ce qui rendait
-- la recherche de créneaux disponibles systématiquement vide.
--
-- Maintenant que `services`/`sub_services` existent réellement dans Supabase
-- (0002_services_catalog.sql), on transforme ces colonnes en vraies clés
-- étrangères uuid — une seule convention, imposée par la base elle-même.
--
-- Les lignes existantes de slots/appointments référencent l'ancien format
-- (slug ou "svc-00X"), incompatible avec les uuid réels : le projet étant
-- encore en phase de livraison (aucune réservation client réelle à préserver),
-- elles sont réinitialisées ici. Calendrier à régénérer ensuite via
-- `npm run seed:slots`.

-- 1. Repartir d'un calendrier propre — les anciennes valeurs ne correspondent
--    à aucun services.id existant, les conserver ferait échouer l'ajout de la FK.
--    Les deux tables sont vidées dans la MÊME instruction : appointments.slot_id
--    référence slots, Postgres refuse un TRUNCATE isolé de la table référencée.
truncate table public.appointments, public.slots;

-- 2. slots.service_id : text (slug) → uuid (FK vers services.id)
alter table public.slots
  alter column service_id type uuid using null;

alter table public.slots
  add constraint slots_service_id_fkey
  foreign key (service_id) references public.services(id) on delete cascade;

-- 3. appointments.service_id : text → uuid (FK vers services.id, obligatoire)
alter table public.appointments
  alter column service_id type uuid using null;

alter table public.appointments
  alter column service_id set not null;

alter table public.appointments
  add constraint appointments_service_id_fkey
  foreign key (service_id) references public.services(id) on delete restrict;

-- 4. appointments.sub_service_id : text → uuid (FK vers sub_services.id, optionnel)
alter table public.appointments
  alter column sub_service_id type uuid using null;

alter table public.appointments
  add constraint appointments_sub_service_id_fkey
  foreign key (sub_service_id) references public.sub_services(id) on delete set null;

-- 5. La fonction RPC de consultation par token doit refléter le nouveau type de
--    colonne. Postgres n'autorise pas CREATE OR REPLACE FUNCTION à changer le
--    type d'une colonne de retour : il faut la supprimer puis la recréer.
drop function if exists public.get_appointment_by_token(uuid);

create function public.get_appointment_by_token(p_token uuid)
returns table (
  id uuid,
  status text,
  client_name text,
  service_id uuid,
  slot_date date,
  slot_start_time time
) as $$
  select a.id, a.status, a.client_name, a.service_id, s.date, s.start_time
  from public.appointments a
  join public.slots s on s.id = a.slot_id
  where a.access_token = p_token;
$$ language sql stable security definer;

grant execute on function public.get_appointment_by_token(uuid) to anon, authenticated;
