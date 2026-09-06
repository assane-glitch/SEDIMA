-- Dates reelles : quand le demarrage ou la fin reels sont renseignes, le planning de la tache
-- suit le reel (la barre se deplace), la reference ne bouge pas, le lot est recalcule par lot_sync
-- et les successeurs suivent par task_link_cascade.
create or replace function public.actuals_sync()
returns trigger language plpgsql as $$
declare v_len integer;
begin
  if tg_op = 'UPDATE' and new.actual_start is not null and new.actual_start is distinct from old.actual_start then
    v_len := new.end_date - new.start_date;
    new.start_date := new.actual_start;
    -- fin reelle inconnue : on conserve la duree planifiee
    if new.actual_end is null then new.end_date := new.actual_start + greatest(v_len, 0); end if;
  end if;
  if new.actual_end is not null and (tg_op = 'INSERT' or new.actual_end is distinct from old.actual_end) then
    new.end_date := new.actual_end;
    if new.actual_start is not null then new.start_date := new.actual_start; end if;
  end if;
  if new.end_date < new.start_date then new.end_date := new.start_date; end if;
  return new;
end $$;
drop trigger if exists actuals_sync on public.tasks;
create trigger actuals_sync before insert or update on public.tasks for each row execute function public.actuals_sync();

-- Une tache reellement demarree n'est plus recalee par la regle des liens (le reel prime)
create or replace function public.task_link_guard()
returns trigger language plpgsql as $$
declare v_min date; v_len integer;
begin
  if new.depends_on is null or new.depends_on = new.id then return new; end if;
  if new.actual_start is not null then return new; end if;
  if pg_trigger_depth() > 40 then return new; end if;
  if tg_op = 'UPDATE' and new.start_date = old.start_date and new.end_date = old.end_date and new.depends_on is not distinct from old.depends_on
     and new.link_type is not distinct from old.link_type and new.lag_weeks = old.lag_weeks then return new; end if;
  v_min := public.task_earliest_start(new.depends_on, new.link_type, new.lag_weeks);
  if v_min is not null and new.start_date < v_min then
    v_len := new.end_date - new.start_date;
    new.start_date := v_min;
    new.end_date := v_min + greatest(v_len, 0);
  end if;
  return new;
end $$;
