-- SEDIMA : journal des depenses (ID lisible, fournisseur, numero de DA, statut). Idempotent.
do $$ begin
  create type public.expense_status as enum ('da_emise', 'commandee', 'livree', 'facturee', 'payee', 'annulee');
exception when duplicate_object then null; end $$;

create sequence if not exists public.expense_ref_seq;

alter table public.expenses
  add column if not exists ref text,
  add column if not exists supplier text not null default '',
  add column if not exists da_number text not null default '',
  add column if not exists status public.expense_status not null default 'facturee';

-- Identifiant lisible D00001, attribue a l'insertion
create or replace function public.expense_set_ref()
returns trigger language plpgsql as $$
begin
  if new.ref is null or new.ref = '' then new.ref := 'D' || lpad(nextval('public.expense_ref_seq')::text, 5, '0'); end if;
  return new;
end $$;
drop trigger if exists expenses_set_ref on public.expenses;
create trigger expenses_set_ref before insert on public.expenses for each row execute function public.expense_set_ref();

update public.expenses set ref = 'D' || lpad(nextval('public.expense_ref_seq')::text, 5, '0') where ref is null or ref = '';
create unique index if not exists expenses_ref_idx on public.expenses(ref);
create index if not exists expenses_status_idx on public.expenses(status);

-- Les depenses annulees ne comptent pas dans le consomme
create or replace view public.project_stats
with (security_invoker = true) as
select
  p.id as project_id,
  p.budget,
  coalesce((select sum(e.amount) from public.expenses e where e.project_id = p.id and e.status <> 'annulee'), 0) as spent,
  coalesce((select count(*) from public.tasks t where t.project_id = p.id and t.parent_id is not null), 0)
    + coalesce((select count(*) from public.tasks t where t.project_id = p.id and t.parent_id is null
                and not exists (select 1 from public.tasks c where c.parent_id = t.id)), 0) as task_count,
  coalesce((select count(*) from public.tasks t where t.project_id = p.id and t.status = 'done'
            and (t.parent_id is not null or not exists (select 1 from public.tasks c where c.parent_id = t.id))), 0) as done_count,
  coalesce((
    select case when sum(t.budget) > 0 then round(sum(t.progress * t.budget) / sum(t.budget)) else round(avg(t.progress)) end
    from public.tasks t where t.project_id = p.id and (t.parent_id is not null or not exists (select 1 from public.tasks c where c.parent_id = t.id))), 0) as progress,
  coalesce((select count(*) from public.tasks t where t.project_id = p.id and t.status <> 'done' and t.end_date < current_date
      and (t.parent_id is not null or not exists (select 1 from public.tasks c where c.parent_id = t.id))), 0) as late_count,
  coalesce((select sum(t.budget) from public.tasks t where t.project_id = p.id and (t.parent_id is not null or not exists (select 1 from public.tasks c where c.parent_id = t.id))), 0) as rebuilt_cost,
  coalesce((select count(*) from public.milestones m where m.project_id = p.id), 0) as milestone_count,
  coalesce((select count(*) from public.milestones m where m.project_id = p.id and m.reached_on is not null), 0) as milestone_reached,
  (select min(m.due_date) from public.milestones m where m.project_id = p.id and m.reached_on is null and m.due_date >= current_date) as next_milestone
from public.projects p;

notify pgrst, 'reload schema';
