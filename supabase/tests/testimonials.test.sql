-- supabase/tests/testimonials.test.sql
--
-- Tests pgTAP des témoignages (P6.2, migration 0020) : lecture publique limitée aux avis publiés,
-- droits par action du domaine `testimonials`, contraintes de valeurs et fonction d'ordre.
-- Lancement : `npm run test:db` (CLI Supabase + Docker). Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(19);

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

-- Nombre de lignes réellement touchées : la RLS filtre en silence les UPDATE/DELETE non autorisés
-- (0 ligne, aucune erreur) ; seul l'INSERT lève une erreur.
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
-- e1 lecteur (view) | e2 éditeur (view + edit) | e3 gestionnaire (view + create + edit + delete) | e4 superadmin
-- Les permissions sont écrites en entier (et non par `jsonb_set`) : le test ne dépend pas des valeurs par défaut.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'viewer@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'editor@test.local'),
  ('00000000-0000-0000-0000-0000000000e3', 'manager@test.local'),
  ('00000000-0000-0000-0000-0000000000e4', 'superadmin@test.local');

update public.profiles
  set permissions = permissions || jsonb_build_object('testimonials', jsonb_build_object('view', true, 'create', false, 'edit', false, 'delete', false))
  where id = '00000000-0000-0000-0000-0000000000e1';
update public.profiles
  set permissions = permissions || jsonb_build_object('testimonials', jsonb_build_object('view', true, 'create', false, 'edit', true, 'delete', false))
  where id = '00000000-0000-0000-0000-0000000000e2';
update public.profiles
  set permissions = permissions || jsonb_build_object('testimonials', jsonb_build_object('view', true, 'create', true, 'edit', true, 'delete', true))
  where id = '00000000-0000-0000-0000-0000000000e3';
update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-0000000000e4';

insert into public.testimonials (id, author_name, content, rating, testimonial_date, is_published, "order") values
  ('a0000000-0000-0000-0000-000000000001', 'Publié', '{"fr":"Très bon travail"}', 5, '2026-01-10', true, 0),
  ('a0000000-0000-0000-0000-000000000002', 'Brouillon', '{"fr":"En attente"}', 4, '2026-02-10', false, 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Visiteur anonyme : uniquement les avis publiés
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_anon();

select is((select count(*) from public.testimonials)::int, 1, 'visiteur : ne voit que les avis publiés');
select throws_ok(
  $$insert into public.testimonials (author_name, content, rating, testimonial_date) values ('X', '{"fr":"x"}', 5, '2026-03-01')$$,
  '42501', null, 'visiteur : ne peut pas créer un avis'
);
select throws_ok(
  $$select public.reorder_testimonials(array['a0000000-0000-0000-0000-000000000001']::uuid[])$$,
  '42501', null, 'visiteur : n''a pas le droit d''exécuter reorder_testimonials'
);

reset role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Admin en lecture seule (e1)
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000e1');

select is((select count(*) from public.testimonials)::int, 2, 'admin testimonials.view : voit aussi les brouillons');
select throws_ok(
  $$insert into public.testimonials (author_name, content, rating, testimonial_date) values ('X', '{"fr":"x"}', 5, '2026-03-01')$$,
  '42501', null, 'admin sans create : INSERT refusé'
);
select is(
  public.tap_rows($$update public.testimonials set is_published = true where id = 'a0000000-0000-0000-0000-000000000002'$$), 0,
  'admin sans edit : UPDATE n''atteint aucune ligne'
);

reset role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Admin « edit » (e2) : modifie et réordonne, ne crée ni ne supprime
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000e2');

select is(
  public.tap_rows($$update public.testimonials set is_published = true where id = 'a0000000-0000-0000-0000-000000000002'$$), 1,
  'admin testimonials.edit : peut publier un avis'
);
select throws_ok(
  $$insert into public.testimonials (author_name, content, rating, testimonial_date) values ('X', '{"fr":"x"}', 5, '2026-03-01')$$,
  '42501', null, 'admin sans create : INSERT refusé même avec edit'
);
select is(
  public.tap_rows($$delete from public.testimonials where id = 'a0000000-0000-0000-0000-000000000002'$$), 0,
  'admin sans delete : DELETE n''atteint aucune ligne'
);

select public.reorder_testimonials(array['a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001']::uuid[]);

reset role;
select is(
  (select "order" from public.testimonials where id = 'a0000000-0000-0000-0000-000000000002'), 0,
  'admin testimonials.edit : reorder_testimonials applique l''ordre du tableau'
);

-- Le lecteur (e1) tente de remettre l'ancien ordre : la RLS s'applique à la fonction (security invoker).
select public.tap_as_user('00000000-0000-0000-0000-0000000000e1');
select public.reorder_testimonials(array['a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002']::uuid[]);

reset role;
select is(
  (select "order" from public.testimonials where id = 'a0000000-0000-0000-0000-000000000001'), 1,
  'admin sans edit : reorder_testimonials ne modifie rien'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Admin « manager » (e3) et superadmin (e4)
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000e3');

select lives_ok(
  $$insert into public.testimonials (author_name, content, rating, testimonial_date) values ('Nouveau', '{"fr":"Parfait"}', 5, '2026-03-01')$$,
  'admin testimonials.create : INSERT autorisé'
);
select is(
  public.tap_rows($$delete from public.testimonials where author_name = 'Nouveau'$$), 1,
  'admin testimonials.delete : DELETE autorisé'
);

reset role;
select public.tap_as_user('00000000-0000-0000-0000-0000000000e4');

select lives_ok(
  $$insert into public.testimonials (author_name, content, rating, testimonial_date) values ('Par le superadmin', '{"fr":"Ok"}', 4, '2026-03-02')$$,
  'superadmin : peut créer un avis'
);

reset role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Contraintes de valeurs (postgres, RLS contourné : on teste la base, pas les droits)
-- ─────────────────────────────────────────────────────────────────────────────

select throws_ok(
  $$insert into public.testimonials (author_name, content, rating, testimonial_date) values ('X', '{"fr":"x"}', 0, '2026-03-01')$$,
  '23514', null, 'contrainte : une note de 0 est refusée'
);
select throws_ok(
  $$insert into public.testimonials (author_name, content, rating, testimonial_date) values ('X', '{"fr":"x"}', 6, '2026-03-01')$$,
  '23514', null, 'contrainte : une note de 6 est refusée'
);
select throws_ok(
  $$insert into public.testimonials (author_name, content, rating, testimonial_date) values ('   ', '{"fr":"x"}', 5, '2026-03-01')$$,
  '23514', null, 'contrainte : un nom d''auteur vide est refusé'
);
select throws_ok(
  $$insert into public.testimonials (author_name, content, rating, testimonial_date) values ('X', '{"en":"only english"}', 5, '2026-03-01')$$,
  '23514', null, 'contrainte : le contenu français est obligatoire'
);
select lives_ok(
  $$insert into public.testimonials (author_name, content, rating, testimonial_date) values ('Borne basse', '{"fr":"x"}', 1, '2026-03-01')$$,
  'contrainte : la note 1 (borne basse) est acceptée'
);

select * from finish();
rollback;
