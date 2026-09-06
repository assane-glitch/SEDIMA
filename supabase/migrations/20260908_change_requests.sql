-- Planning de reference sous controle : registre des demandes de changement.
-- 1. Les nouvelles taches recoivent une reference egale a leur planning initial.
-- 2. La reference ne se modifie ensuite que par une demande de changement approuvee
--    (ou par le gel initial d'un projet qui n'a encore aucune reference).

-- ---------- Registre ----------
create sequence if not exists public.change_request_seq;
create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  ref text not null unique default ('DC' || lpad(nextval('public.change_request_seq')::text, 4, '0')),
  title text not null,
  reason text not null default '',
  status text not null default 'soumise' check (status in ('soumise', 'approuvee', 'refusee')),
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists change_requests_project_idx on public.change_requests(project_id, requested_at desc);

create table if not exists public.change_request_items (
  request_id uuid not null references public.change_requests(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  old_start date, old_end date,
  new_start date not null, new_end date not null,
  primary key (request_id, task_id)
);

-- Qui decide : administrateur ou chef de projet du projet
create or replace function public.can_decide(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'admin' or exists (select 1 from public.projects p where p.id = p_project and p.manager_id = auth.uid())
$$;

alter table public.change_requests enable row level security;
alter table public.change_request_items enable row level security;
drop policy if exists cr_select on public.change_requests;
create policy cr_select on public.change_requests for select to authenticated using (true);
drop policy if exists cr_insert on public.change_requests;
create policy cr_insert on public.change_requests for insert to authenticated with check (public.is_editor() and requested_by = auth.uid());
drop policy if exists cr_update on public.change_requests;
create policy cr_update on public.change_requests for update to authenticated using (public.can_decide(project_id) or (requested_by = auth.uid() and status = 'soumise')) with check (true);
drop policy if exists cr_delete on public.change_requests;
create policy cr_delete on public.change_requests for delete to authenticated using (status = 'soumise' and (requested_by = auth.uid() or public.can_decide(project_id)));
drop policy if exists cri_select on public.change_request_items;
create policy cri_select on public.change_request_items for select to authenticated using (true);
drop policy if exists cri_insert on public.change_request_items;
create policy cri_insert on public.change_request_items for insert to authenticated with check (exists (select 1 from public.change_requests r where r.id = request_id and r.requested_by = auth.uid() and r.status = 'soumise'));

-- ---------- Verrou de la reference sur les taches ----------
create or replace function public.baseline_default()
returns trigger language plpgsql as $$
begin
  if new.baseline_start is null then new.baseline_start := new.start_date; end if;
  if new.baseline_end is null then new.baseline_end := new.end_date; end if;
  return new;
end $$;
drop trigger if exists baseline_default on public.tasks;
create trigger baseline_default before insert on public.tasks for each row execute function public.baseline_default();

create or replace function public.baseline_guard()
returns trigger language plpgsql as $$
begin
  if (new.baseline_start is distinct from old.baseline_start or new.baseline_end is distinct from old.baseline_end)
     and coalesce(current_setting('sedima.baseline_unlock', true), '') <> 'on' then
    raise exception 'Le planning de reference ne se modifie que par une demande de changement approuvee (registre des changements).';
  end if;
  return new;
end $$;
drop trigger if exists baseline_guard on public.tasks;
create trigger baseline_guard before update on public.tasks for each row execute function public.baseline_guard();

-- Gel initial : seulement si le projet n'a encore aucune reference
create or replace function public.freeze_baseline(p_project uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_editor() then raise exception 'Droits insuffisants'; end if;
  if exists (select 1 from public.tasks where project_id = p_project and baseline_start is not null) then
    raise exception 'Ce projet a deja une reference : passez par une demande de changement.';
  end if;
  perform set_config('sedima.baseline_unlock', 'on', true);
  update public.tasks set baseline_start = start_date, baseline_end = end_date where project_id = p_project;
  get diagnostics n = row_count;
  return n;
end $$;

-- Decision : approbation (applique les nouvelles references) ou refus
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
    from public.change_request_items i where i.request_id = p_id and t.id = i.task_id;
    get diagnostics n = row_count;
  end if;
  update public.change_requests set status = case when p_approve then 'approuvee' else 'refusee' end, decided_by = auth.uid(), decided_at = now(), decision_note = coalesce(p_note, '') where id = p_id;
  return n;
end $$;

-- Historique des demandes
drop trigger if exists audit_change_requests on public.change_requests;
create trigger audit_change_requests after insert or update or delete on public.change_requests for each row execute function public.audit_changes();
