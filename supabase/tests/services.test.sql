-- supabase/tests/services.test.sql
--
-- Tests pgTAP du catalogue (P3) : RLS de services / sub_services / service_media par action
-- (migration 0006) et fonctions atomiques d'ordre et de couverture (migration 0010).
-- Lancement : `npm run test:db` (CLI Supabase + Docker). Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(15);

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

-- Nombre de lignes réellement touchées par une écriture : la RLS filtre en silence les UPDATE/DELETE
-- non autorisés (0 ligne, aucune erreur), seul l'INSERT lève une erreur.
create function public.tap_rows(p_sql text) returns integer language plpgsql as $$
declare
  affected integer;
begin
  execute p_sql;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fixtures (postgres)
-- ─────────────────────────────────────────────────────────────────────────────
-- c1 admin « viewer » (droits par défaut : services.view seulement)
-- c2 admin « editor » (services.edit) | c3 admin « manager » (create + edit + delete)

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'viewer@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'editor@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'manager@test.local');

update public.profiles set permissions = jsonb_set(permissions, '{services,edit}', 'true')
  where id = '00000000-0000-0000-0000-0000000000c2';
update public.profiles
  set permissions = jsonb_set(jsonb_set(jsonb_set(permissions, '{services,create}', 'true'), '{services,edit}', 'true'), '{services,delete}', 'true')
  where id = '00000000-0000-0000-0000-0000000000c3';

insert into public.services (id, slug, name, short_description, full_description, icon, is_active, "order") values
  ('70000000-0000-0000-0000-000000000001', 'actif', '{"fr":"Actif"}', '{"fr":"a"}', '{"fr":"a"}', 'Hammer', true, 0),
  ('70000000-0000-0000-0000-000000000002', 'archive', '{"fr":"Archivé"}', '{"fr":"a"}', '{"fr":"a"}', 'Hammer', false, 1);

insert into public.service_media (id, service_id, type, public_id, is_cover, "order") values
  ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'image', 'byb/services/actif/a', true, 0),
  ('71000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'image', 'byb/services/actif/b', false, 1),
  ('71000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', 'image', 'byb/services/archive/a', true, 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Lecture publique : uniquement les services actifs et leurs médias
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_anon();
select is((select count(*) from public.services)::int, 1, 'visiteur : ne voit que les services actifs');
select is((select count(*) from public.service_media)::int, 2, 'visiteur : ne voit pas les médias d''un service archivé');

reset role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Admin en lecture seule : voit tout, ne modifie rien
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000c1');
select is((select count(*) from public.services)::int, 2, 'admin services.view : voit aussi les services archivés');
select throws_ok(
  $$insert into public.services (slug, name, short_description, full_description, icon) values ('x', '{"fr":"x"}', '{"fr":"x"}', '{"fr":"x"}', 'Hammer')$$,
  '42501', null, 'admin sans create : INSERT refusé'
);
select is(
  public.tap_rows($$update public.services set icon = 'Wrench' where slug = 'actif'$$), 0,
  'admin sans edit : UPDATE n''atteint aucune ligne'
);
select public.reorder_services(array['70000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001']::uuid[]);
reset role;
select is(
  (select "order" from public.services where slug = 'actif'), 0,
  'admin sans edit : reorder_services ne modifie rien (la RLS s''applique aux fonctions)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Admin « edit » : modifie et réordonne, ne crée ni ne supprime
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000c2');
select is(
  public.tap_rows($$update public.services set icon = 'Wrench' where slug = 'actif'$$), 1,
  'admin services.edit : UPDATE autorisé'
);
select throws_ok(
  $$insert into public.services (slug, name, short_description, full_description, icon) values ('y', '{"fr":"y"}', '{"fr":"y"}', '{"fr":"y"}', 'Hammer')$$,
  '42501', null, 'admin sans create : INSERT refusé même avec edit'
);
select is(
  public.tap_rows($$delete from public.services where slug = 'archive'$$), 0,
  'admin sans delete : DELETE n''atteint aucune ligne'
);

select public.reorder_services(array['70000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001']::uuid[]);
select is(
  (select "order" from public.services where slug = 'archive'), 0,
  'admin services.edit : reorder_services applique l''ordre du tableau'
);

select public.set_service_cover('70000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000002');
select is(
  (select array_agg(id::text) from public.service_media where service_id = '70000000-0000-0000-0000-000000000001' and is_cover),
  array['71000000-0000-0000-0000-000000000002'],
  'set_service_cover : une seule couverture, la nouvelle'
);
select throws_ok(
  $$select public.set_service_cover('70000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000003')$$,
  'P0002', 'MEDIA_NOT_FOUND', 'set_service_cover : refuse le média d''un autre service'
);

reset role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Admin « manager » et garde-fou de l'index partiel
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000c3');
select lives_ok(
  $$insert into public.services (slug, name, short_description, full_description, icon) values ('z', '{"fr":"z"}', '{"fr":"z"}', '{"fr":"z"}', 'Hammer')$$,
  'admin services.create : INSERT autorisé'
);
select is(
  public.tap_rows($$delete from public.services where slug = 'z'$$), 1,
  'admin services.delete : DELETE autorisé'
);
select throws_ok(
  $$update public.service_media set is_cover = true where id = '71000000-0000-0000-0000-000000000001'$$,
  '23505', null, 'index partiel : deux couvertures pour un même service sont impossibles'
);

select * from finish();
rollback;
