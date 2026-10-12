-- supabase/tests/appointments_reschedule_delete.test.sql
--
-- Tests pgTAP de la replanification et de la suppression d'un rendez-vous (P4.3, P4.4, migration 0012) :
-- atomicité, anti-double-réservation, libération du créneau et respect de la RLS par action.
-- Lancement : `npm run test:db` (CLI Supabase + Docker). Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(17);

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
-- c1 : appointments.view + edit, sans delete      c2 : appointments.view + delete, sans edit
-- c3 : superadmin

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'editor@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'deleter@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'super@test.local');

update public.profiles
  set permissions = jsonb_set(jsonb_set(jsonb_set(permissions, '{appointments,view}', 'true'), '{appointments,edit}', 'true'), '{appointments,delete}', 'false')
  where id = '00000000-0000-0000-0000-0000000000d1';

update public.profiles
  set permissions = jsonb_set(jsonb_set(jsonb_set(permissions, '{appointments,view}', 'true'), '{appointments,edit}', 'false'), '{appointments,delete}', 'true')
  where id = '00000000-0000-0000-0000-0000000000d2';

update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-0000000000d3';

insert into public.services (id, slug, name, short_description, full_description, icon, is_active, "order") values
  ('93000000-0000-0000-0000-00000000000a', 'toiture', '{"fr":"Toiture"}', '{"fr":"a"}', '{"fr":"a"}', 'Hammer', true, 0),
  ('93000000-0000-0000-0000-00000000000b', 'bardage', '{"fr":"Bardage"}', '{"fr":"a"}', '{"fr":"a"}', 'Hammer', true, 1);

insert into public.slots (id, date, start_time, end_time, status, service_id) values
  ('94000000-0000-0000-0000-000000000001', '2099-02-10', '09:00', '10:00', 'booked',    '93000000-0000-0000-0000-00000000000a'),
  ('94000000-0000-0000-0000-000000000002', '2099-02-10', '10:00', '11:00', 'available', '93000000-0000-0000-0000-00000000000a'),
  ('94000000-0000-0000-0000-000000000003', '2099-02-10', '11:00', '12:00', 'available', '93000000-0000-0000-0000-00000000000b'),
  ('94000000-0000-0000-0000-000000000004', '2099-02-10', '12:00', '13:00', 'booked',    '93000000-0000-0000-0000-00000000000a'),
  ('94000000-0000-0000-0000-000000000005', '2099-02-10', '13:00', '14:00', 'booked',    '93000000-0000-0000-0000-00000000000a'),
  ('94000000-0000-0000-0000-000000000006', '2099-02-10', '14:00', '15:00', 'available', '93000000-0000-0000-0000-00000000000a');

insert into public.appointments (id, slot_id, service_id, client_name, client_email, client_phone, status) values
  ('95000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-00000000000a', 'Alice', 'alice@test.local', '+32 470 00 00 01', 'confirmed'),
  ('95000000-0000-0000-0000-000000000004', '94000000-0000-0000-0000-000000000004', '93000000-0000-0000-0000-00000000000a', 'Dan',   'dan@test.local',   '+32 470 00 00 04', 'cancelled'),
  ('95000000-0000-0000-0000-000000000005', '94000000-0000-0000-0000-000000000005', '93000000-0000-0000-0000-00000000000a', 'Eve',   'eve@test.local',   '+32 470 00 00 05', 'confirmed');

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Replanification par un admin « éditeur »
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000d1');

select lives_ok(
  $$select public.reschedule_appointment('95000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000002')$$,
  'admin appointments.edit : replanifie sur un créneau libre du même service'
);

select throws_ok(
  $$select public.reschedule_appointment('95000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000002')$$,
  'P0001', 'SLOT_UNAVAILABLE', 'le créneau actuel ne peut pas être reprisé comme nouveau créneau'
);

select throws_ok(
  $$select public.reschedule_appointment('95000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000003')$$,
  'P0001', 'SLOT_UNAVAILABLE', 'un créneau d''un autre service est refusé'
);

select throws_ok(
  $$select public.reschedule_appointment('95000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000005')$$,
  'P0001', 'SLOT_UNAVAILABLE', 'un créneau déjà réservé est refusé'
);

select throws_ok(
  $$select public.reschedule_appointment('95000000-0000-0000-0000-000000000004', '94000000-0000-0000-0000-000000000006')$$,
  'P0001', 'INVALID_STATUS_TRANSITION', 'un rendez-vous annulé ne peut pas être déplacé'
);

select throws_ok(
  $$select public.reschedule_appointment('95000000-0000-0000-0000-0000000000ff', '94000000-0000-0000-0000-000000000006')$$,
  'P0001', 'APPOINTMENT_NOT_FOUND', 'un rendez-vous inconnu est refusé'
);

reset role;

select is(
  (select slot_id::text from public.appointments where id = '95000000-0000-0000-0000-000000000001'),
  '94000000-0000-0000-0000-000000000002',
  'le rendez-vous pointe sur le nouveau créneau'
);
select is(
  (select status from public.slots where id = '94000000-0000-0000-0000-000000000001'), 'available',
  'l''ancien créneau est libéré'
);
select is(
  (select status from public.slots where id = '94000000-0000-0000-0000-000000000002'), 'booked',
  'le nouveau créneau est réservé'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Suppression : sans appointments.delete, rien ne change
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000d1');

select throws_ok(
  $$select public.delete_appointment('95000000-0000-0000-0000-000000000005')$$,
  'P0001', 'APPOINTMENT_NOT_FOUND', 'sans appointments.delete, la ligne n''est pas supprimable (RLS)'
);

reset role;

select is(
  (select count(*)::int from public.appointments where id = '95000000-0000-0000-0000-000000000005'), 1,
  'le rendez-vous est toujours là après le refus'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Suppression par un admin « supprimeur »
-- ─────────────────────────────────────────────────────────────────────────────
-- appointments.delete sans edit : la suppression est permise, mais libérer le créneau passe par
-- slots_update_admin (edit/create). Sans ce droit, la fonction doit tout annuler plutôt que de
-- laisser un créneau réservé à jamais.

select public.tap_as_user('00000000-0000-0000-0000-0000000000d2');

select throws_ok(
  $$select public.delete_appointment('95000000-0000-0000-0000-000000000005')$$,
  'P0001', 'FORBIDDEN', 'suppression d''un rendez-vous actif sans pouvoir libérer le créneau : tout est annulé'
);

reset role;

select is(
  (select count(*)::int from public.appointments where id = '95000000-0000-0000-0000-000000000005'), 1,
  'atomicité : le rendez-vous n''a pas été supprimé après l''échec'
);

-- Un rendez-vous déjà annulé ne touche pas au créneau : la suppression réussit sans droit sur les créneaux.
select public.tap_as_user('00000000-0000-0000-0000-0000000000d2');

select lives_ok(
  $$select public.delete_appointment('95000000-0000-0000-0000-000000000004')$$,
  'suppression d''un rendez-vous annulé : réussie, le créneau n''est pas modifié'
);

reset role;

select is(
  (select status from public.slots where id = '94000000-0000-0000-0000-000000000004'), 'booked',
  'le créneau d''un rendez-vous annulé supprimé reste inchangé (il peut avoir été repris)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Superadmin et visiteur anonyme
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000d3');

select lives_ok(
  $$select public.delete_appointment('95000000-0000-0000-0000-000000000005')$$,
  'superadmin : supprime un rendez-vous actif et libère son créneau'
);

reset role;
select public.tap_as_anon();

select throws_ok(
  $$select public.delete_appointment('95000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'visiteur anonyme : exécution refusée'
);

select * from finish();
rollback;
