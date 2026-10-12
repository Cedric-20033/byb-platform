-- supabase/migrations/0011_admin_create_appointment.sql
--
-- Création manuelle d'un rendez-vous par un admin (P4.2).
--
-- Une réservation touche DEUX tables : le créneau (réservé, ou créé à la volée pour un créneau
-- ponctuel) et le rendez-vous. Les faire en deux requêtes depuis l'application laisserait un
-- créneau réservé sans rendez-vous si la seconde échoue. Une fonction = une transaction.
--
-- SECURITY INVOKER : la fonction s'exécute avec les droits de l'appelant, donc la RLS de 0006
-- reste la barrière : `appointments.create` pour le rendez-vous, `appointments.create` (via
-- slots_update_admin) pour réserver un créneau existant, `slots.create` pour un créneau ponctuel.
-- Aucune élévation de privilèges.
--
-- Anti-double-réservation :
--   • créneau existant : UPDATE conditionnel (status = 'available'), une seule requête concurrente gagne ;
--   • index unique partiel appointments_slot_active_unique (0001) en filet de sécurité ;
--   • créneau ponctuel : contrainte slots_no_duplicate (0001) contre les doublons exacts.
-- Le chevauchement d'un créneau ponctuel avec un autre créneau du même service est vérifié par
-- l'application (règle métier, risque de course négligeable pour une action réservée aux admins).
--
-- Erreurs : `raise exception '<CODE>'` ; l'application traduit le message en code d'erreur stable.

create or replace function public.admin_create_appointment(
  p_service_id uuid,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_sub_service_id uuid default null,
  -- Soit un créneau existant (p_slot_id), soit un créneau ponctuel (date + horaires).
  p_slot_id uuid default null,
  p_date date default null,
  p_start_time time default null,
  p_end_time time default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_slot_id uuid;
  v_appointment_id uuid;
begin
  -- Un service archivé n'est plus réservable, y compris manuellement.
  if not exists (select 1 from public.services where id = p_service_id and is_active) then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  -- La clé étrangère garantit que la sous-prestation existe, pas qu'elle appartient à ce service.
  if p_sub_service_id is not null and not exists (
    select 1 from public.sub_services where id = p_sub_service_id and service_id = p_service_id
  ) then
    raise exception 'SUB_SERVICE_NOT_FOUND';
  end if;

  if p_slot_id is not null then
    update public.slots
       set status = 'booked'
     where id = p_slot_id
       and status = 'available'
       and service_id = p_service_id
    returning id into v_slot_id;

    if v_slot_id is null then
      raise exception 'SLOT_UNAVAILABLE';
    end if;
  elsif p_date is not null and p_start_time is not null and p_end_time is not null then
    if p_start_time >= p_end_time then
      raise exception 'VALIDATION_FAILED';
    end if;

    insert into public.slots (date, start_time, end_time, status, service_id)
    values (p_date, p_start_time, p_end_time, 'booked', p_service_id)
    returning id into v_slot_id;
  else
    raise exception 'VALIDATION_FAILED';
  end if;

  -- Créé directement confirmé : c'est l'équipe qui prend le rendez-vous, il n'y a rien à valider.
  insert into public.appointments (
    slot_id, service_id, sub_service_id, client_name, client_email, client_phone, notes, status
  )
  values (
    v_slot_id, p_service_id, p_sub_service_id, p_client_name, p_client_email, p_client_phone, p_notes, 'confirmed'
  )
  returning id into v_appointment_id;

  return v_appointment_id;
end;
$$;

revoke all on function public.admin_create_appointment(uuid, text, text, text, uuid, uuid, date, time, time, text) from public, anon;
grant execute on function public.admin_create_appointment(uuid, text, text, text, uuid, uuid, date, time, time, text) to authenticated;
