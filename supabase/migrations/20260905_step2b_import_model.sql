-- SEDIMA etape 2b : aligner le modele sur le referentiel des investissements CAPEX.
-- A executer apres 20260905_step1_structure.sql. Idempotent.

-- ---------- Cycle de vie des projets (statuts du referentiel) ----------
do $$ begin
  create type public.project_status_v2 as enum ('plan', 'cadrage', 'approuve', 'engage', 'execution', 'cloture', 'hors_perimetre');
exception when duplicate_object then null; end $$;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projects' and column_name = 'status' and udt_name = 'project_status') then
    drop view if exists public.project_stats;
    alter table public.projects alter column status drop default;
    alter table public.projects alter column status type public.project_status_v2
      using (case status::text
        when 'planning' then 'plan' when 'active' then 'execution' when 'on_hold' then 'hors_perimetre'
        when 'completed' then 'cloture' when 'cancelled' then 'hors_perimetre' else 'plan' end)::public.project_status_v2;
    alter table public.projects alter column status set default 'plan';
    drop type public.project_status;
  end if;
end $$;

-- ---------- Champs du referentiel sur les projets ----------
alter table public.projects
  add column if not exists site text not null default '',
  add column if not exists business_unit text not null default '',
  add column if not exists pillar text not null default '',
  add column if not exists plan_objective text not null default '',
  add column if not exists wbs_nature text not null default '',
  add column if not exists data_quality text not null default '',      -- Contrat, Offres, Plan KPMG, Estimation
  add column if not exists budget_kpmg numeric(14,2) not null default 0, -- enveloppe du plan KPMG (HTVA)
  add column if not exists manager_name text not null default '',       -- nom du chef de projet tant qu'il n'a pas de compte
  add column if not exists source_note text not null default '',
  add column if not exists comment text not null default '';

-- Repartition pluriannuelle du cout (onglet Tranches)
create table if not exists public.project_budget_years (
  project_id uuid not null references public.projects(id) on delete cascade,
  year smallint not null,
  amount numeric(14,2) not null default 0,
  primary key (project_id, year)
);
alter table public.project_budget_years enable row level security;
drop policy if exists pby_select on public.project_budget_years;
create policy pby_select on public.project_budget_years for select to authenticated using (true);
drop policy if exists pby_write on public.project_budget_years;
create policy pby_write on public.project_budget_years for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- ---------- Champs du referentiel sur les taches (lots et taches) ----------
alter table public.tasks
  add column if not exists wbs_code text,                               -- L1, L1.2 ...
  add column if not exists responsible_role text not null default '',  -- Conducteur de travaux, Chef de projet ...
  add column if not exists depends_on uuid references public.tasks(id) on delete set null,
  add column if not exists link_type text not null default '',          -- FD (fin-debut) ou DD (debut-debut)
  add column if not exists customs numeric(14,2) not null default 0,
  add column if not exists vat numeric(14,2) not null default 0,
  add column if not exists estimate_method text not null default '',
  add column if not exists confidence text not null default '';
create unique index if not exists tasks_project_wbs_idx on public.tasks(project_id, wbs_code) where wbs_code is not null;

-- ---------- Vue de synthese (recreee avec le nouveau statut) ----------
create or replace view public.project_stats
with (security_invoker = true) as
select
  p.id as project_id,
  p.budget,
  coalesce((select sum(e.amount) from public.expenses e where e.project_id = p.id), 0) as spent,
  coalesce((select count(*) from public.tasks t where t.project_id = p.id and t.parent_id is not null), 0)
    + coalesce((select count(*) from public.tasks t where t.project_id = p.id and t.parent_id is null
                and not exists (select 1 from public.tasks c where c.parent_id = t.id)), 0) as task_count,
  coalesce((select count(*) from public.tasks t where t.project_id = p.id and t.status = 'done'
            and (t.parent_id is not null or not exists (select 1 from public.tasks c where c.parent_id = t.id))), 0) as done_count,
  coalesce((
    select case when sum(t.budget) > 0
      then round(sum(t.progress * t.budget) / sum(t.budget))
      else round(avg(t.progress)) end
    from public.tasks t where t.project_id = p.id
      and (t.parent_id is not null or not exists (select 1 from public.tasks c where c.parent_id = t.id))), 0) as progress,
  coalesce((
    select count(*) from public.tasks t
    where t.project_id = p.id and t.status <> 'done' and t.end_date < current_date
      and (t.parent_id is not null or not exists (select 1 from public.tasks c where c.parent_id = t.id))), 0) as late_count,
  coalesce((select sum(t.budget) from public.tasks t where t.project_id = p.id
      and (t.parent_id is not null or not exists (select 1 from public.tasks c where c.parent_id = t.id))), 0) as rebuilt_cost,
  coalesce((select count(*) from public.milestones m where m.project_id = p.id), 0) as milestone_count,
  coalesce((select count(*) from public.milestones m where m.project_id = p.id and m.reached_on is not null), 0) as milestone_reached,
  (select min(m.due_date) from public.milestones m where m.project_id = p.id and m.reached_on is null and m.due_date >= current_date) as next_milestone
from public.projects p;

notify pgrst, 'reload schema';
