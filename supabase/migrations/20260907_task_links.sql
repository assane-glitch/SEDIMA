-- Liens entre taches : decalage en semaines et regle "pas la meme semaine que la tache precedente".
-- Une tache liee demarre au plus tot le lundi de la semaine qui suit la date de reference de son
-- predecesseur (fin pour FD, debut pour DD), plus lag_weeks semaines. Si la date saisie est plus
-- tot, la tache est decalee en conservant sa duree ; les successeurs suivent en cascade.

alter table public.tasks add column if not exists lag_weeks integer not null default 0;

create or replace function public.task_earliest_start(p_pred uuid, p_link text, p_lag integer)
returns date language sql stable as $$
  select (date_trunc('week', case when p_link = 'DD' then start_date else end_date end)::date + 7 * (1 + greatest(coalesce(p_lag, 0), 0)))
  from public.tasks where id = p_pred
$$;

create or replace function public.task_link_guard()
returns trigger language plpgsql as $$
declare v_min date; v_len integer;
begin
  if new.depends_on is null or new.depends_on = new.id then return new; end if;
  if pg_trigger_depth() > 40 then return new; end if;  -- garde-fou contre les boucles de dependances
  -- Ne recale que lorsque le lien ou les dates changent (pas sur une simple mise a jour d'avancement, de reference...)
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

drop trigger if exists task_link_guard on public.tasks;
create trigger task_link_guard before insert or update on public.tasks for each row execute function public.task_link_guard();

create or replace function public.task_link_cascade()
returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() > 40 then return null; end if;
  if new.start_date is distinct from old.start_date or new.end_date is distinct from old.end_date then
    -- Recale les successeurs qui demarrent trop tot (duree conservee) ; leurs propres successeurs suivent par recursion.
    update public.tasks s set start_date = m.min_start, end_date = m.min_start + (s.end_date - s.start_date)
    from (select t.id, public.task_earliest_start(t.depends_on, t.link_type, t.lag_weeks) as min_start from public.tasks t where t.depends_on = new.id and t.id <> new.id) m
    where s.id = m.id and s.start_date < m.min_start;
  end if;
  return null;
end $$;

drop trigger if exists task_link_cascade on public.tasks;
create trigger task_link_cascade after update on public.tasks for each row execute function public.task_link_cascade();

-- Realignement a la demande de toutes les taches liees d'un projet (ou de tous) : renvoie le nombre de taches decalees.
create or replace function public.realign_task_links(p_project uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_before integer; v_after integer;
begin
  if not (public.current_user_role() in ('admin', 'manager')) then raise exception 'Non autorise'; end if;
  select count(*) into v_before from public.tasks t where (p_project is null or t.project_id = p_project) and t.depends_on is not null
    and t.start_date < public.task_earliest_start(t.depends_on, t.link_type, t.lag_weeks);
  -- plusieurs passes : chaque passe recale les taches dont le predecesseur est deja en place
  for i in 1..20 loop
    update public.tasks s set start_date = m.min_start, end_date = m.min_start + (s.end_date - s.start_date)
    from (select t.id, public.task_earliest_start(t.depends_on, t.link_type, t.lag_weeks) as min_start from public.tasks t
          where (p_project is null or t.project_id = p_project) and t.depends_on is not null) m
    where s.id = m.id and s.start_date < m.min_start;
    if not found then exit; end if;
  end loop;
  select count(*) into v_after from public.tasks t where (p_project is null or t.project_id = p_project) and t.depends_on is not null
    and t.start_date < public.task_earliest_start(t.depends_on, t.link_type, t.lag_weeks);
  return v_before - v_after;
end $$;
