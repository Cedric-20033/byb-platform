-- supabase/tests/token_access_and_rate_limit.test.sql
--
-- Tests pgTAP (P10.2) : fonctions « par jeton » de la migration 0001, fermées au public par la 0023 et
-- réservées au code serveur ; fermeture de `rate_limit_events` (migration 0017) ; clé étrangère
-- service -> rendez-vous (0003).
-- Lancement : `npm run test:db` (CLI Supabase + Docker). Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(20);

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
-- Fixtures (postgres) : deux clients, chacun avec son jeton
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.services (id, slug, name, short_description, full_description, icon, is_active) values
  ('80000000-0000-0000-0000-000000000001', 'svc-token', '{"fr":"Service"}', '{"fr":"s"}', '{"fr":"s"}', 'Home', true);

insert into public.slots (id, date, start_time, end_time, status, service_id) values
  ('81000000-0000-0000-0000-000000000001', '2030-02-04', '09:00', '10:00', 'booked', '80000000-0000-0000-0000-000000000001'),
  ('81000000-0000-0000-0000-000000000002', '2030-02-04', '10:00', '11:00', 'booked', '80000000-0000-0000-0000-000000000001');

insert into public.appointments (id, slot_id, service_id, client_name, client_email, client_phone, status, access_token) values
  ('82000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001',
   'Client Un', 'un@test.local', '+32 111 11 11 11', 'confirmed', '83000000-0000-0000-0000-000000000001'),
  ('82000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001',
   'Client Deux', 'deux@test.local', '+32 222 22 22 22', 'confirmed', '83000000-0000-0000-0000-000000000002');

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fonctions par jeton : leur comportement, vu du code serveur (service_role)
-- ─────────────────────────────────────────────────────────────────────────────

set local role service_role;

select is(
  (select client_name from public.get_appointment_by_token('83000000-0000-0000-0000-000000000001')),
  'Client Un', 'get_appointment_by_token : un jeton valide renvoie son propre rendez-vous'
);
select is(
  (select count(*) from public.get_appointment_by_token('83000000-0000-0000-0000-00000000ffff'))::int, 0,
  'get_appointment_by_token : un jeton inconnu ne renvoie rien'
);
select lives_ok(
  $$select public.cancel_appointment_by_token('83000000-0000-0000-0000-000000000001')$$,
  'cancel_appointment_by_token : un jeton valide annule le rendez-vous'
);

reset role;

select is(
  (select status from public.appointments where id = '82000000-0000-0000-0000-000000000001'),
  'cancelled', 'annulation par jeton : le rendez-vous est annulé'
);
select is(
  (select status from public.slots where id = '81000000-0000-0000-0000-000000000001'),
  'available', 'annulation par jeton : le créneau est libéré'
);
select is(
  (select status from public.appointments where id = '82000000-0000-0000-0000-000000000002'),
  'confirmed', 'annulation par jeton : le rendez-vous d''un autre client n''est pas touché'
);
select is(
  (select status from public.slots where id = '81000000-0000-0000-0000-000000000002'),
  'booked', 'annulation par jeton : le créneau d''un autre client reste réservé'
);

set local role service_role;

select throws_ok(
  $$select public.cancel_appointment_by_token('83000000-0000-0000-0000-000000000001')$$,
  'P0001', null, 'cancel_appointment_by_token : annuler deux fois est refusé'
);
select throws_ok(
  $$select public.cancel_appointment_by_token('83000000-0000-0000-0000-00000000ffff')$$,
  'P0001', null, 'cancel_appointment_by_token : un jeton inconnu est refusé'
);

reset role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Migration 0023 : ni un visiteur ni un compte connecté ne peuvent les appeler
-- ─────────────────────────────────────────────────────────────────────────────
-- Un jeton ne doit plus permettre d'annuler en contournant l'audit, les emails et la limitation de débit.
-- `throws_ok` échoue aussi si EXECUTE subsiste via PUBLIC, qu'un simple REVOKE sur `anon` laisserait passer.

select public.tap_as_anon();
select throws_ok(
  $$select 1 from public.appointments$$,
  '42501', null, 'anon : aucune lecture directe de la table des rendez-vous (RGPD)'
);
select throws_ok(
  $$select * from public.get_appointment_by_token('83000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'anon : ne peut pas exécuter get_appointment_by_token'
);
select throws_ok(
  $$select public.cancel_appointment_by_token('83000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'anon : ne peut pas annuler un rendez-vous par jeton'
);

reset role;
select public.tap_as_user('00000000-0000-0000-0000-0000000000f1');
select throws_ok(
  $$select * from public.get_appointment_by_token('83000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'authenticated : ne peut pas exécuter get_appointment_by_token'
);
select throws_ok(
  $$select public.cancel_appointment_by_token('83000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'authenticated : ne peut pas annuler un rendez-vous par jeton'
);

reset role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. rate_limit_events : réservée au code serveur (service_role)
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_anon();
select throws_ok(
  $$select 1 from public.rate_limit_events$$,
  '42501', null, 'rate_limit_events : un visiteur ne peut pas lire les tentatives'
);
select throws_ok(
  $$insert into public.rate_limit_events (key) values ('booking:create:ip:1.2.3.4')$$,
  '42501', null, 'rate_limit_events : un visiteur ne peut pas écrire'
);

reset role;
select public.tap_as_user('00000000-0000-0000-0000-0000000000f1');
select throws_ok(
  $$select 1 from public.rate_limit_events$$,
  '42501', null, 'rate_limit_events : un compte connecté ne peut pas lire non plus'
);

reset role;
set local role service_role;
select lives_ok(
  $$insert into public.rate_limit_events (key) values ('booking:create:ip:1.2.3.4')$$,
  'rate_limit_events : le code serveur (service_role) peut écrire'
);
select is(
  (select count(*) from public.rate_limit_events where key = 'booking:create:ip:1.2.3.4')::int, 1,
  'rate_limit_events : le code serveur (service_role) peut lire'
);
reset role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Intégrité : un service qui a des rendez-vous ne peut pas être supprimé
-- ─────────────────────────────────────────────────────────────────────────────

select throws_ok(
  $$delete from public.services where id = '80000000-0000-0000-0000-000000000001'$$,
  '23503', null, 'FK : supprimer un service ayant des rendez-vous est refusé (on archive à la place)'
);

select * from finish();
rollback;
