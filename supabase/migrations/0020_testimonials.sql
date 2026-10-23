-- supabase/migrations/0020_testimonials.sql
--
-- Témoignages clients : P6.2.
--
-- Le contenu est traduisible (JSONB { fr, en?, de? }, français obligatoire) ; le nom et la
-- localité de l'auteur sont des noms propres, donc non traduits. Un témoignage n'apparaît
-- sur le site qu'une fois publié. Droits par action du domaine `testimonials` (cf. 0006 / 0008).

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_location text not null default '',
  content jsonb not null,
  rating smallint not null,
  -- Date de l'avis (et non de sa saisie) : permet de trier les avis par ancienneté réelle.
  testimonial_date date not null,
  -- public_id du fournisseur média ; jamais une URL complète.
  avatar_public_id text,
  is_published boolean not null default false,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonials_rating_check check (rating between 1 and 5),
  constraint testimonials_author_name_check check (btrim(author_name) <> ''),
  constraint testimonials_content_fr_check check (coalesce(content->>'fr', '') <> '')
);

create index if not exists testimonials_published_order_idx on public.testimonials(is_published, "order");

drop trigger if exists set_updated_at on public.testimonials;
create trigger set_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();

alter table public.testimonials enable row level security;

create policy "testimonials_select_public"
  on public.testimonials for select
  to anon, authenticated
  using (is_published = true);

create policy "testimonials_select_admin"
  on public.testimonials for select
  to authenticated
  using (public.can_do('testimonials', 'view'));

create policy "testimonials_insert_admin"
  on public.testimonials for insert
  to authenticated
  with check (public.can_do('testimonials', 'create'));

create policy "testimonials_update_admin"
  on public.testimonials for update
  to authenticated
  using (public.can_do('testimonials', 'edit'))
  with check (public.can_do('testimonials', 'edit'));

create policy "testimonials_delete_admin"
  on public.testimonials for delete
  to authenticated
  using (public.can_do('testimonials', 'delete'));

grant select on public.testimonials to anon;
grant select, insert, update, delete on public.testimonials to authenticated;

create or replace function public.reorder_testimonials(p_ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.testimonials t
     set "order" = x.pos - 1
    from unnest(p_ordered_ids) with ordinality as x(id, pos)
   where t.id = x.id;
end;
$$;

revoke all on function public.reorder_testimonials(uuid[]) from public, anon;
grant execute on function public.reorder_testimonials(uuid[]) to authenticated;
