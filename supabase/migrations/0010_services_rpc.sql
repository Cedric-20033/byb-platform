-- supabase/migrations/0010_services_rpc.sql
--
-- Opérations atomiques du catalogue (P3) : réordonnancement et média de couverture.
-- Ces opérations touchent plusieurs lignes : les faire depuis l'application en
-- plusieurs requêtes laisserait un état incohérent en cas d'échec partiel
-- (deux couvertures, ordre à trous). Une fonction = une transaction.
--
-- SECURITY INVOKER : les fonctions s'exécutent avec les droits de l'appelant,
-- donc les politiques RLS de 0006 (services.edit) s'appliquent telles quelles.
-- Aucune élévation de privilèges n'est introduite.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Réordonnancement : l'ordre = la position dans le tableau fourni (0..n-1)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.reorder_services(p_ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.services s
     set "order" = t.pos - 1
    from unnest(p_ordered_ids) with ordinality as t(id, pos)
   where s.id = t.id;
end;
$$;

create or replace function public.reorder_sub_services(p_service_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.sub_services s
     set "order" = t.pos - 1
    from unnest(p_ordered_ids) with ordinality as t(id, pos)
   where s.id = t.id
     and s.service_id = p_service_id;
end;
$$;

create or replace function public.reorder_service_media(p_service_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.service_media m
     set "order" = t.pos - 1
    from unnest(p_ordered_ids) with ordinality as t(id, pos)
   where m.id = t.id
     and m.service_id = p_service_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Couverture : retire l'ancienne puis pose la nouvelle dans la même transaction
-- ─────────────────────────────────────────────────────────────────────────────
-- L'index unique partiel service_media_one_cover_idx interdit deux couvertures :
-- l'ordre des deux UPDATE est donc impératif.

create or replace function public.set_service_cover(p_service_id uuid, p_media_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.service_media
     set is_cover = false
   where service_id = p_service_id
     and is_cover = true
     and id <> p_media_id;

  update public.service_media
     set is_cover = true
   where id = p_media_id
     and service_id = p_service_id;

  -- Média inconnu ou d'un autre service (ou invisible sous RLS) : on annule tout,
  -- sinon le service se retrouverait sans couverture.
  if not found then
    raise exception 'MEDIA_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.reorder_services(uuid[]) from public, anon;
revoke all on function public.reorder_sub_services(uuid, uuid[]) from public, anon;
revoke all on function public.reorder_service_media(uuid, uuid[]) from public, anon;
revoke all on function public.set_service_cover(uuid, uuid) from public, anon;

grant execute on function public.reorder_services(uuid[]) to authenticated;
grant execute on function public.reorder_sub_services(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_service_media(uuid, uuid[]) to authenticated;
grant execute on function public.set_service_cover(uuid, uuid) to authenticated;
