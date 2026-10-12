-- supabase/tests/admin_create_appointment.test.sql
--
-- Tests pgTAP de la création manuelle d'un rendez-vous (P4.2, migration 0011) :
-- atomicité, anti-double-réservation, règles du catalogue et respect de la RLS par action.
-- Lancement : `npm run test:db` (CLI Supabase + Docker). Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(14);

create function public.tap_as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function public.tap_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fixtures (postgres)
-- ─────────────────────────────────────────────────────────────────────────────
-- c1 admin « créateur » : appointments.create, sans slots.create
-- c2 admin « éditeur »  : appointments.edit mais PAS appointments.create
-- c3 superadmin

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'creator@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'editor@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'super@test.local');

update public.profiles
  set permissions = jsonb_set(jsonb_set(jsonb_set(permissions, '{appointments,view}', 'true'), '{appointments,create}', 'true'), '{slots,create}', 'false')
  where id = '00000000-0000-0000-0000-0000000000c1';

update public.profiles
  set permissions = jsonb_set(jsonb_set(jsonb_set(permissions, '{appointments,view}', 'true'), '{appointments,edit}', 'true'), '{appointments,create}', 'false')
  where id = '00000000-0000-0000-0000-0000000000c2';

update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-0000000000c3';

insert into public.services (id, slug, name, short_description, full_description, icon, is_active, "order") values
  ('90000000-0000-0000-0000-00000000000a', 'toiture', '{"fr":"Toiture"}', '{"fr":"a"}', '{"fr":"a"}', 'Hammer', true, 0),
  ('90000000-0000-0000-0000-00000000000b', 'bardage', '{"fr":"Bardage"}', '{"fr":"a"}', '{"fr":"a"}', 'Hammer', true, 1),
  ('90000000-0000-0000-0000-00000000000c', 'archive', '{"fr":"Archivé"}', '{"fr":"a"}', '{"fr":"a"}', 'Hammer', false, 2);

insert into public.sub_services (id, service_id, slug, name, description, "order") values
  ('91000000-0000-0000-0000-00000000000b', '90000000-0000-0000-0000-00000000000b', 'pose', '{"fr":"Pose"}', '{"fr":"d"}', 0);

insert into public.slots (id, date, start_time, end_time, status, service_id) values
  ('92000000-0000-0000-0000-000000000001', '2099-01-10', '09:00', '10:00', 'available', '90000000-0000-0000-0000-00000000000a'),
  ('92000000-0000-0000-0000-000000000002', '2099-01-10', '10:00', '11:00', 'available', '90000000-0000-0000-0000-00000000000b'),
  ('92000000-0000-0000-0000-000000000003', '2099-01-10', '11:00', '12:00', 'available', '90000000-0000-0000-0000-00000000000a');

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Admin « créateur » : réservation d'un créneau existant
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000c1');

select lives_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000a', p_client_name => 'Alice Martin',
      p_client_email => 'alice@test.local', p_client_phone => '+32 470 00 00 00',
      p_slot_id => '92000000-0000-0000-0000-000000000001')$$,
  'admin appointments.create : réserve un créneau libre'
);

select throws_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000a', p_client_name => 'Bob',
      p_client_email => 'bob@test.local', p_client_phone => '+32 470 00 00 01',
      p_slot_id => '92000000-0000-0000-0000-000000000001')$$,
  'P0001', 'SLOT_UNAVAILABLE', 'un créneau déjà réservé ne l''est pas deux fois'
);

select throws_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000a', p_client_name => 'Bob',
      p_client_email => 'bob@test.local', p_client_phone => '+32 470 00 00 01',
      p_slot_id => '92000000-0000-0000-0000-000000000002')$$,
  'P0001', 'SLOT_UNAVAILABLE', 'le créneau d''un autre service est refusé'
);

select throws_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000c', p_client_name => 'Bob',
      p_client_email => 'bob@test.local', p_client_phone => '+32 470 00 00 01',
      p_slot_id => '92000000-0000-0000-0000-000000000003')$$,
  'P0001', 'SERVICE_NOT_FOUND', 'un service archivé n''est pas réservable'
);

select throws_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000a', p_sub_service_id => '91000000-0000-0000-0000-00000000000b',
      p_client_name => 'Bob', p_client_email => 'bob@test.local', p_client_phone => '+32 470 00 00 01',
      p_slot_id => '92000000-0000-0000-0000-000000000003')$$,
  'P0001', 'SUB_SERVICE_NOT_FOUND', 'une sous-prestation d''un autre service est refusée'
);

select throws_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000a', p_client_name => 'Bob',
      p_client_email => 'bob@test.local', p_client_phone => '+32 470 00 00 01')$$,
  'P0001', 'VALIDATION_FAILED', 'ni créneau existant ni créneau ponctuel complet : refusé'
);

select throws_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000a', p_client_name => 'Bob',
      p_client_email => 'bob@test.local', p_client_phone => '+32 470 00 00 01',
      p_date => '2099-01-11', p_start_time => '09:00', p_end_time => '10:00')$$,
  '42501', null, 'créneau ponctuel sans slots.create : refusé par la RLS'
);

reset role;

select is(
  (select status from public.slots where id = '92000000-0000-0000-0000-000000000001'), 'booked',
  'le créneau réservé est passé à « booked »'
);
select is(
  (select status from public.appointments where client_email = 'alice@test.local'), 'confirmed',
  'le rendez-vous est créé directement confirmé'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Admin « éditeur » : sans appointments.create, rien ne subsiste (transaction annulée)
-- ─────────────────────────────────────────────────────────────────────────────
-- Le droit appointments.edit suffit à passer le créneau en « booked » (slots_update_admin) :
-- c'est l'INSERT du rendez-vous, refusé, qui doit annuler aussi la réservation du créneau.

select public.tap_as_user('00000000-0000-0000-0000-0000000000c2');

select throws_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000a', p_client_name => 'Eve',
      p_client_email => 'eve@test.local', p_client_phone => '+32 470 00 00 02',
      p_slot_id => '92000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'admin sans appointments.create : INSERT du rendez-vous refusé'
);

reset role;

select is(
  (select status from public.slots where id = '92000000-0000-0000-0000-000000000003'), 'available',
  'atomicité : le créneau n''est pas resté réservé après l''échec'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Superadmin : créneau ponctuel
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000c3');

select lives_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000a', p_client_name => 'Carl',
      p_client_email => 'carl@test.local', p_client_phone => '+32 470 00 00 03',
      p_date => '2099-01-12', p_start_time => '08:30', p_end_time => '09:15')$$,
  'superadmin : crée un créneau ponctuel et son rendez-vous'
);

select throws_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000a', p_client_name => 'Dan',
      p_client_email => 'dan@test.local', p_client_phone => '+32 470 00 00 04',
      p_date => '2099-01-12', p_start_time => '08:30', p_end_time => '09:15')$$,
  '23505', null, 'créneau ponctuel identique : refusé par la contrainte d''unicité'
);

reset role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Visiteur anonyme : aucun accès à la fonction
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_anon();

select throws_ok(
  $$select public.admin_create_appointment(
      p_service_id => '90000000-0000-0000-0000-00000000000a', p_client_name => 'Zed',
      p_client_email => 'zed@test.local', p_client_phone => '+32 470 00 00 09',
      p_slot_id => '92000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'visiteur anonyme : exécution refusée'
);

select * from finish();
rollback;
