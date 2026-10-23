-- supabase/tests/audit_logs.test.sql
--
-- Tests pgTAP du journal d'audit : index de pagination et immuabilité (migration 0009),
-- lecture sous permission `audit_logs.view` (migration 0006).
-- Lancement : `npm run test:db` (CLI Supabase + Docker). Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(10);

create function public.tap_as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fixtures (postgres)
-- ─────────────────────────────────────────────────────────────────────────────
-- b1 admin avec audit_logs.view | b2 admin aux droits par défaut (pas de journal)
-- b3 compte qui sera supprimé (auteur d'une ligne de journal)

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'auditor@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'plain-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'leaver@test.local');

update public.profiles set permissions = jsonb_set(permissions, '{audit_logs,view}', 'true')
  where id = '00000000-0000-0000-0000-0000000000b1';

insert into public.audit_logs (id, actor_id, actor_role, action, target_type) values
  ('60000000-0000-0000-0000-000000000001', null, 'system', 'TEST', 'test'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b3', 'admin', 'TEST', 'test');

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Index de pagination
-- ─────────────────────────────────────────────────────────────────────────────

select has_index('public', 'audit_logs', 'audit_logs_created_at_idx', 'index de pagination (created_at, id) présent');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Immuabilité : refusée même au propriétaire de la table (postgres) et au service_role
-- ─────────────────────────────────────────────────────────────────────────────

select throws_ok(
  $$update public.audit_logs set action = 'FALSIFIE' where id = '60000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'journal : UPDATE refusé, même pour postgres'
);
select throws_ok(
  $$delete from public.audit_logs where id = '60000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'journal : DELETE refusé, même pour postgres'
);
select throws_ok(
  $$truncate public.audit_logs$$,
  '42501', null, 'journal : TRUNCATE refusé'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Suppression d'un compte : la ligne survit, son auteur passe à NULL
-- ─────────────────────────────────────────────────────────────────────────────

select lives_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-0000000000b3'$$,
  'supprimer un compte ne casse pas le journal (actor_id → NULL autorisé)'
);
select is(
  (select actor_id from public.audit_logs where id = '60000000-0000-0000-0000-000000000002'),
  null, 'la ligne du compte supprimé a perdu son auteur'
);
select is(
  (select action from public.audit_logs where id = '60000000-0000-0000-0000-000000000002'),
  'TEST', 'la ligne du compte supprimé est conservée, inchangée par ailleurs'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Lecture sous permission, écriture impossible depuis l'API
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000b1');
select ok(
  (select count(*) from public.audit_logs) >= 2,
  'admin avec audit_logs.view : lit le journal'
);
select throws_ok(
  $$insert into public.audit_logs (actor_role, action, target_type) values ('admin', 'FAUX', 'test')$$,
  '42501', null, 'admin : ne peut pas écrire dans le journal depuis l''API'
);

reset role;
select public.tap_as_user('00000000-0000-0000-0000-0000000000b2');
select is(
  (select count(*) from public.audit_logs)::int, 0,
  'admin sans audit_logs.view : ne voit aucune ligne'
);

select * from finish();
rollback;
