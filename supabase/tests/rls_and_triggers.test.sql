-- supabase/tests/rls_and_triggers.test.sql
--
-- Tests pgTAP : RLS granulaire (migration 0006), trigger handle_new_user et
-- helpers RBAC (migration 0005), contrainte anti-double-réservation.
-- Lancement : `npm run test:db` (nécessite la CLI Supabase et Docker).
--
-- Principe : les fixtures sont créées en tant que postgres (RLS contourné),
-- puis chaque bloc "se fait passer" pour un profil via les claims JWT et le rôle
-- Postgres `authenticated`/`anon`, exactement comme PostgREST le fait en production.
-- Les écritures refusées par le RLS sont silencieuses (0 ligne affectée) : on
-- les vérifie en revenant en postgres et en contrôlant que l'état n'a pas changé.
-- Tout est annulé en fin de transaction (rollback).

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(29);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers d'impersonation (créés dans la transaction, annulés au rollback)
-- ─────────────────────────────────────────────────────────────────────────────

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
-- a1 superadmin | a2 admin (permissions par défaut) | a3 admin + slots.edit
-- a4 admin avec holidays.create mais SANS holidays.edit
-- a5 admin + appointments.edit | a6 admin DÉSACTIVÉ (droits par défaut sur le papier)

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'superadmin@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'slot-editor@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'holiday-creator@test.local'),
  ('00000000-0000-0000-0000-0000000000a5', 'appointment-editor@test.local'),
  ('00000000-0000-0000-0000-0000000000a6', 'disabled@test.local');
-- → le trigger handle_new_user crée automatiquement les 6 profils.

update public.profiles set role = 'superadmin'
  where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set permissions = jsonb_set(permissions, '{slots,edit}', 'true')
  where id = '00000000-0000-0000-0000-0000000000a3';
update public.profiles set permissions = jsonb_set(permissions, '{holidays,edit}', 'false')
  where id = '00000000-0000-0000-0000-0000000000a4';
update public.profiles set permissions = jsonb_set(permissions, '{appointments,edit}', 'true')
  where id = '00000000-0000-0000-0000-0000000000a5';
update public.profiles set is_active = false
  where id = '00000000-0000-0000-0000-0000000000a6';

insert into public.services (id, slug, name, short_description, full_description, icon, is_active) values
  ('10000000-0000-0000-0000-000000000001', 'svc-actif', '{"fr":"Actif"}', '{"fr":"a"}', '{"fr":"a"}', 'Home', true),
  ('10000000-0000-0000-0000-000000000002', 'svc-inactif', '{"fr":"Inactif"}', '{"fr":"i"}', '{"fr":"i"}', 'Home', false);

insert into public.slots (id, date, start_time, end_time, status, service_id) values
  ('20000000-0000-0000-0000-000000000001', '2030-01-07', '09:00', '10:00', 'booked',    '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '2030-01-07', '10:00', '11:00', 'available', '10000000-0000-0000-0000-000000000001');

insert into public.appointments (id, slot_id, service_id, client_name, client_email, client_phone, status) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', 'Client Test', 'client@test.local', '+32 000 00 00 00', 'pending');

insert into public.holidays (id, date, label) values
  ('40000000-0000-0000-0000-000000000001', '2030-12-25', 'Noël (fixture)');

insert into public.audit_logs (id, actor_role, action, target_type) values
  ('50000000-0000-0000-0000-000000000001', 'system', 'TEST', 'test');

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Visiteur anonyme
-- ─────────────────────────────────────────────────────────────────────────────

reset role;
select public.tap_as_anon();

select is((select count(*) from public.slots)::int, 2, 'anon : voit les créneaux (calendrier public)');
select throws_ok(
  $$select 1 from public.appointments$$,
  '42501', null, 'anon : aucun accès à la table des rendez-vous (RGPD)'
);
select is((select count(*) from public.services)::int, 1, 'anon : ne voit que les services actifs');
select throws_ok(
  $$insert into public.holidays (date, label) values ('2030-01-01', 'x')$$,
  '42501', null, 'anon : ne peut pas créer un jour férié'
);
select throws_ok(
  $$select 1 from public.audit_logs$$,
  '42501', null, 'anon : aucun accès au journal d''audit'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Admin aux permissions par défaut (a2)
-- ─────────────────────────────────────────────────────────────────────────────

reset role;
select public.tap_as_user('00000000-0000-0000-0000-0000000000a2');

select lives_ok(
  $$insert into public.holidays (date, label) values ('2030-01-02', 'Pont')$$,
  'admin par défaut : peut créer un jour férié (holidays.create)'
);
select is((select count(*) from public.appointments)::int, 1, 'admin par défaut : voit les rendez-vous (appointments.view)');
select is((select count(*) from public.services)::int, 2, 'admin par défaut : voit aussi les services inactifs (services.view)');
select is((select count(*) from public.profiles)::int, 1, 'admin par défaut : ne voit que son propre profil');
select is((select count(*) from public.audit_logs)::int, 0, 'admin par défaut : ne voit pas le journal d''audit');
select throws_ok(
  $$insert into public.slots (date, start_time, end_time, service_id)
    values ('2030-02-01', '09:00', '10:00', '10000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'admin par défaut : ne peut pas créer de créneau (slots.create = false)'
);

-- Tentatives silencieusement refusées : confirmées après retour en postgres.
update public.appointments set status = 'confirmed' where id = '30000000-0000-0000-0000-000000000001';
update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-0000000000a2';

reset role;
select is(
  (select status from public.appointments where id = '30000000-0000-0000-0000-000000000001'),
  'pending', 'admin par défaut : ne peut pas confirmer un RDV (appointments.edit = false)'
);
select is(
  (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  'admin', 'admin : ne peut pas s''octroyer le rôle superadmin (escalade de privilèges)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Admin avec slots.edit uniquement (a3)
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000a3');
update public.slots set status = 'blocked' where id = '20000000-0000-0000-0000-000000000002';
select throws_ok(
  $$insert into public.slots (date, start_time, end_time, service_id)
    values ('2030-02-01', '09:00', '10:00', '10000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'admin slots.edit : ne peut pas créer de créneau (create distinct de edit)'
);

reset role;
select is(
  (select status from public.slots where id = '20000000-0000-0000-0000-000000000002'),
  'blocked', 'admin slots.edit : peut bloquer un créneau'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Admin holidays.create SANS holidays.edit (a4) — le cas qui cassait avant 0006
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000a4');
select lives_ok(
  $$insert into public.holidays (date, label) values ('2030-03-03', 'Création autorisée')$$,
  'admin holidays.create : peut créer un jour férié'
);
update public.holidays set label = 'Modifié' where id = '40000000-0000-0000-0000-000000000001';

reset role;
select is(
  (select label from public.holidays where id = '40000000-0000-0000-0000-000000000001'),
  'Noël (fixture)', 'admin holidays.create sans edit : ne peut pas modifier un jour férié'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Contrainte anti-double-réservation (postgres, avant l'annulation ci-dessous)
-- ─────────────────────────────────────────────────────────────────────────────

select throws_ok(
  $$insert into public.appointments (slot_id, service_id, client_name, client_email, client_phone)
    values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
            'Doublon', 'doublon@test.local', '+32 111 11 11 11')$$,
  '23505', null, 'un créneau ne peut avoir qu''un seul rendez-vous actif (index unique partiel)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Admin appointments.edit (a5) : annule un RDV ET libère son créneau
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000a5');
update public.appointments set status = 'cancelled' where id = '30000000-0000-0000-0000-000000000001';
update public.slots set status = 'available' where id = '20000000-0000-0000-0000-000000000001';

reset role;
select is(
  (select status from public.appointments where id = '30000000-0000-0000-0000-000000000001'),
  'cancelled', 'admin appointments.edit : peut annuler un rendez-vous'
);
select is(
  (select status from public.slots where id = '20000000-0000-0000-0000-000000000001'),
  'available', 'admin appointments.edit : le créneau du RDV annulé est bien libéré'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Superadmin (a1)
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000a1');

select lives_ok(
  $$insert into public.slots (date, start_time, end_time, service_id)
    values ('2030-02-01', '11:00', '12:00', '10000000-0000-0000-0000-000000000001')$$,
  'superadmin : peut créer un créneau'
);
select is((select count(*) from public.audit_logs)::int, 1, 'superadmin : lit le journal d''audit');

select throws_ok(
  $$delete from public.audit_logs where id = '50000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'journal d''audit : même le superadmin n''a aucun droit DELETE'
);
update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-0000000000a3';

reset role;
select is(
  (select count(*) from public.audit_logs)::int, 1,
  'journal d''audit immuable : même le superadmin ne peut pas supprimer une ligne'
);
select is(
  (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  'superadmin', 'superadmin : peut modifier le rôle d''un autre profil'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Admin désactivé (a6) : aucun droit, malgré ses permissions enregistrées
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000a6');

select is((select count(*) from public.appointments)::int, 0, 'admin désactivé : ne voit plus aucun rendez-vous');
select throws_ok(
  $$insert into public.holidays (date, label) values ('2030-04-04', 'Interdit')$$,
  '42501', null, 'admin désactivé : ne peut plus rien écrire'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Trigger handle_new_user
-- ─────────────────────────────────────────────────────────────────────────────

reset role;
select is(
  (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a5'),
  'admin', 'trigger : un nouveau compte est créé avec le rôle admin (jamais superadmin)'
);
select is(
  (select permissions from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  (select jsonb_set(public.default_admin_permissions(), '{slots,edit}', 'true')),
  'trigger : permissions initiales = permissions par défaut'
);

select * from finish();
rollback;
