-- Les lots (taches parentes) ne se modifient que par la somme de leurs taches :
-- avancement pondere par le budget, budget = somme, dates = min / max. Idempotent.

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
    and (budget, progress, customs, vat, start_date, end_date, status, actual_start, actual_end) is distinct from
        (r.budget, r.progress::smallint, r.customs, r.vat, coalesce(r.s, start_date), coalesce(r.e, end_date), st, r.as_, r.ae);
end $$;

-- Toute ecriture directe sur un lot est remplacee par le calcul
create or replace function public.lot_guard()
returns trigger language plpgsql as $$
declare r record;
begin
  if exists (select 1 from public.tasks c where c.parent_id = new.id) then
    select coalesce(sum(budget), 0) as budget,
      case when sum(budget) > 0 then round(sum(progress * budget) / sum(budget)) else coalesce(round(avg(progress)), 0) end as progress,
      min(start_date) as s, max(end_date) as e, coalesce(sum(customs), 0) as customs, coalesce(sum(vat), 0) as vat
    into r from public.tasks where parent_id = new.id;
    new.budget := r.budget; new.progress := r.progress; new.customs := r.customs; new.vat := r.vat;
    new.start_date := coalesce(r.s, new.start_date); new.end_date := coalesce(r.e, new.end_date);
  end if;
  return new;
end $$;
drop trigger if exists lot_guard on public.tasks;
create trigger lot_guard before update on public.tasks for each row execute function public.lot_guard();

-- Toute modification d'une tache met son lot a jour
create or replace function public.lot_sync()
returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.parent_id is not null then perform public.lot_recompute(new.parent_id); end if;
  if tg_op in ('UPDATE', 'DELETE') and old.parent_id is not null and (tg_op = 'DELETE' or old.parent_id is distinct from new.parent_id) then perform public.lot_recompute(old.parent_id); end if;
  return null;
end $$;
drop trigger if exists lot_sync on public.tasks;
create trigger lot_sync after insert or update or delete on public.tasks for each row execute function public.lot_sync();

-- Figer le planning actuel comme reference (utilise par le bouton des Parametres)
create or replace function public.freeze_baseline(p_project uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_editor() then raise exception 'Droits insuffisants'; end if;
  update public.tasks set baseline_start = start_date, baseline_end = end_date where project_id = p_project;
  get diagnostics n = row_count;
  return n;
end $$;

-- Recalcul initial de tous les lots existants
do $$ declare l record; begin
  for l in select distinct parent_id as id from public.tasks where parent_id is not null loop perform public.lot_recompute(l.id); end loop;
end $$;

notify pgrst, 'reload schema';
