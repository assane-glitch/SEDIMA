-- Calendrier de travail : jours ouvres de la semaine, heures par jour et jours feries.
-- Gere dans Administration > Calendrier ; lu par le Gantt (jours chomes grises) et le tiroir de tache (duree en jours ouvres).
-- Idempotent.

create table if not exists public.calendar_settings (
  id smallint primary key default 1 check (id = 1),
  work_days smallint[] not null default '{1,2,3,4,5}',   -- jours ISO : 1 = lundi ... 7 = dimanche
  hours_per_day numeric(4,1) not null default 8 check (hours_per_day > 0 and hours_per_day <= 24),
  updated_at timestamptz not null default now()
);
insert into public.calendar_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  label text not null,
  recurring boolean not null default false,               -- chaque annee a la meme date (jour et mois)
  created_at timestamptz not null default now(),
  unique (day, label)
);
create index if not exists holidays_day_idx on public.holidays(day);

alter table public.calendar_settings enable row level security;
alter table public.holidays enable row level security;
drop policy if exists calendar_select on public.calendar_settings;
create policy calendar_select on public.calendar_settings for select to authenticated using (true);
drop policy if exists calendar_admin on public.calendar_settings;
create policy calendar_admin on public.calendar_settings for all to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
drop policy if exists holidays_select on public.holidays;
create policy holidays_select on public.holidays for select to authenticated using (true);
drop policy if exists holidays_admin on public.holidays;
create policy holidays_admin on public.holidays for all to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop trigger if exists audit_holidays on public.holidays;
create trigger audit_holidays after insert or update or delete on public.holidays for each row execute function public.audit_changes();
drop trigger if exists audit_calendar_settings on public.calendar_settings;
create trigger audit_calendar_settings after insert or update or delete on public.calendar_settings for each row execute function public.audit_changes();

-- Jours feries legaux a date fixe (Senegal), recurrents ; les fetes a date mobile s'ajoutent dans Administration.
insert into public.holidays (day, label, recurring) values
  ('2026-01-01', 'Jour de l''An', true),
  ('2026-04-04', 'Fete de l''Independance', true),
  ('2026-05-01', 'Fete du Travail', true),
  ('2026-08-15', 'Assomption', true),
  ('2026-11-01', 'Toussaint', true),
  ('2026-12-25', 'Noel', true)
on conflict (day, label) do nothing;
