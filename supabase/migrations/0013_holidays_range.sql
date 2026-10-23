-- supabase/migrations/0013_holidays_range.sql
--
-- Congés sur une PLAGE de dates (P4.7). Jusqu'ici un congé = un jour (`date`).
--
-- `end_date` est le DERNIER jour inclus. Elle est NOT NULL et vaut `date` pour un jour unique : la
-- requête de recouvrement d'une période reste une simple comparaison (`date <= fin AND end_date >= début`),
-- sans `COALESCE`, et un index peut la servir.
--
-- Rétrocompatibilité : un trigger BEFORE INSERT renseigne `end_date = date` quand elle est omise, donc
-- les insertions existantes (scripts de seed, anciennes versions de l'application) continuent de fonctionner.
--
-- Récurrence : une plage récurrente se répète chaque année aux mêmes mois/jour. Elle ne peut donc pas
-- chevaucher deux années (31 déc. → 2 janv.) : la comparaison de mois/jour de `Holiday.appliesTo` ne le
-- représenterait pas. Deux congés distincts suffisent dans ce cas.

alter table public.holidays add column if not exists end_date date;

update public.holidays set end_date = date where end_date is null;

alter table public.holidays alter column end_date set not null;

alter table public.holidays
  add constraint holidays_end_date_after_start check (end_date >= date);

alter table public.holidays
  add constraint holidays_recurring_range_same_year
  check (not is_recurring or extract(year from end_date) = extract(year from date));

create or replace function public.holidays_default_end_date()
returns trigger
language plpgsql
as $$
begin
  new.end_date := coalesce(new.end_date, new.date);
  return new;
end;
$$;

-- Un trigger BEFORE s'exécute avant la vérification NOT NULL : l'omission de `end_date` est donc permise.
create trigger holidays_default_end_date
  before insert on public.holidays
  for each row execute function public.holidays_default_end_date();

create index if not exists holidays_range_idx on public.holidays (date, end_date);
