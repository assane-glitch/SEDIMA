-- Durcissement suite a l'audit : role a l'inscription, registre des changements, dependances,
-- cascade sur taches demarrees, ordre des triggers, recalcul des lots.

-- 1. Role d'un nouveau compte : seul un compte invite (invited_at) peut recevoir un role via ses metadonnees
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := coalesce(new.raw_user_meta_data->>'role', 'viewer');
  first_user boolean;
begin
  perform pg_advisory_xact_lock(hashtext('handle_new_user'));
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when first_user then 'admin'::public.user_role
         when new.invited_at is not null and requested in ('admin','manager','viewer','field') then requested::public.user_role
         else 'viewer'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- 2. Registre des changements : le demandeur ne modifie qu'une demande soumise (titre, motif) ;
--    la decision passe uniquement par decide_change_request
drop policy if exists cr_update on public.change_requests;
create policy cr_update on public.change_requests for update to authenticated
  using (requested_by = auth.uid() and status = 'soumise')
  with check (requested_by = auth.uid() and status = 'soumise');
-- les lignes d'une demande ne peuvent viser que des taches du meme projet
drop policy if exists cri_insert on public.change_request_items;
create policy cri_insert on public.change_request_items for insert to authenticated
  with check (exists (select 1 from public.change_requests r join public.tasks t on t.id = task_id
                      where r.id = request_id and r.requested_by = auth.uid() and r.status = 'soumise' and t.project_id = r.project_id));

create or replace function public.decide_change_request(p_id uuid, p_approve boolean, p_note text default '')
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  select * into r from public.change_requests where id = p_id;
  if r.id is null then raise exception 'Demande introuvable'; end if;
  if r.status <> 'soumise' then raise exception 'Demande deja traitee'; end if;
  if not public.can_decide(r.project_id) then raise exception 'Seul un administrateur ou le chef de projet peut decider'; end if;
  if p_approve then
    perform set_config('sedima.baseline_unlock', 'on', true);
    update public.tasks t set baseline_start = i.new_start, baseline_end = i.new_end
    from public.change_request_items i where i.request_id = p_id and t.id = i.task_id and t.project_id = r.project_id;
    get diagnostics n = row_count;
  end if;
  update public.change_requests set status = case when p_approve then 'approuvee' else 'refusee' end, decided_by = auth.uid(), decided_at = now(), decision_note = coalesce(p_note, '') where id = p_id;
  return n;
end $$;

-- 3. Liens : refus des dependances circulaires ; le reel prime (une tache demarree n'est plus recalee)
create or replace function public.task_link_guard()
returns trigger language plpgsql as $$
declare v_min date; v_len integer; v_cur uuid; v_steps integer := 0;
begin
  if new.depends_on is null or new.depends_on = new.id then new.depends_on := null; return new; end if;
  -- cycle : on remonte la chaine des predecesseurs
  v_cur := new.depends_on;
  while v_cur is not null and v_steps < 100 loop
    if v_cur = new.id then raise exception 'Dependance circulaire : la tache % depend deja de celle-ci', new.wbs_code; end if;
    select depends_on into v_cur from public.tasks where id = v_cur;
    v_steps := v_steps + 1;
  end loop;
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

create or replace function public.task_link_cascade()
returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() > 40 then return null; end if;
  if new.start_date is distinct from old.start_date or new.end_date is distinct from old.end_date then
    update public.tasks s set start_date = m.min_start, end_date = m.min_start + (s.end_date - s.start_date)
    from (select t.id, public.task_earliest_start(t.depends_on, t.link_type, t.lag_weeks) as min_start from public.tasks t
          where t.depends_on = new.id and t.id <> new.id and t.actual_start is null) m
    where s.id = m.id and s.start_date < m.min_start;
  end if;
  return null;
end $$;

create or replace function public.realign_task_links(p_project uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_before integer; v_after integer;
begin
  if public.current_user_role() <> 'admin' then raise exception 'Reserve aux administrateurs'; end if;
  select count(*) into v_before from public.tasks t where (p_project is null or t.project_id = p_project) and t.depends_on is not null and t.actual_start is null
    and t.start_date < public.task_earliest_start(t.depends_on, t.link_type, t.lag_weeks);
  for i in 1..20 loop
    update public.tasks s set start_date = m.min_start, end_date = m.min_start + (s.end_date - s.start_date)
    from (select t.id, public.task_earliest_start(t.depends_on, t.link_type, t.lag_weeks) as min_start from public.tasks t
          where (p_project is null or t.project_id = p_project) and t.depends_on is not null and t.actual_start is null) m
    where s.id = m.id and s.start_date < m.min_start;
    if not found then exit; end if;
  end loop;
  select count(*) into v_after from public.tasks t where (p_project is null or t.project_id = p_project) and t.depends_on is not null and t.actual_start is null
    and t.start_date < public.task_earliest_start(t.depends_on, t.link_type, t.lag_weeks);
  return v_before - v_after;
end $$;

-- 4. Ordre des triggers BEFORE INSERT : la reference se fixe apres le recalage par les liens
drop trigger if exists baseline_default on public.tasks;
drop trigger if exists z_baseline_default on public.tasks;
create trigger z_baseline_default before insert on public.tasks for each row execute function public.baseline_default();

-- 5. Recalcul des lots : la reference du lot est aussi comparee (sinon reste figee apres un changement approuve)
create or replace function public.lot_recompute(lot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record; st public.task_status;
begin
  select
    coalesce(sum(budget), 0) as budget,
    case when sum(budget) > 0 then round(sum(progress * budget) / sum(budget)) else coalesce(round(avg(progress)), 0) end as progress,
    min(start_date) as s, max(end_date) as e,
    min(baseline_start) as bs, max(baseline_end) as be,
    min(actual_start) as as_, case when bool_and(actual_end is not null) then max(actual_end) else null end as ae,
    coalesce(sum(customs), 0) as customs, coalesce(sum(vat), 0) as vat,
    count(*) as n
  into r
  from public.tasks where parent_id = lot_id;
  if r.n = 0 then return; end if;
  st := (case when r.progress >= 100 then 'done' when r.progress > 0 then 'in_progress' else 'todo' end)::public.task_status;
  update public.tasks set
    budget = r.budget, progress = r.progress, customs = r.customs, vat = r.vat,
    start_date = coalesce(r.s, start_date), end_date = coalesce(r.e, end_date),
    baseline_start = coalesce(r.bs, baseline_start), baseline_end = coalesce(r.be, baseline_end),
    actual_start = r.as_, actual_end = r.ae, status = st
  where id = lot_id
    and (budget, progress, customs, vat, start_date, end_date, status, actual_start, actual_end, baseline_start, baseline_end) is distinct from
        (r.budget, r.progress::smallint, r.customs, r.vat, coalesce(r.s, start_date), coalesce(r.e, end_date), st, r.as_, r.ae, coalesce(r.bs, baseline_start), coalesce(r.be, baseline_end));
end $$;
