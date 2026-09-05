-- SEDIMA : schema initial. A executer dans Supabase > SQL Editor. Idempotent.

-- ---------- Types ----------
do $$ begin
  create type public.user_role as enum ('admin', 'manager', 'viewer', 'field');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('todo', 'in_progress', 'done', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.entry_source as enum ('web', 'mobile');
exception when duplicate_object then null; end $$;

-- ---------- Profils ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := coalesce(new.raw_user_meta_data->>'role', 'viewer');
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when first_user then 'admin'::public.user_role
         when requested in ('admin','manager','viewer','field') then requested::public.user_role
         else 'viewer'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Role de l'utilisateur courant (utilise par les policies)
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_editor()
returns boolean language sql stable as $$
  select public.current_user_role() in ('admin', 'manager');
$$;

create or replace function public.can_submit()
returns boolean language sql stable as $$
  select public.current_user_role() in ('admin', 'manager', 'field');
$$;

-- ---------- Projets ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  status public.project_status not null default 'planning',
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  budget numeric(14,2) not null default 0 check (budget >= 0),
  currency text not null default 'XOF',
  manager_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Taches (lignes du Gantt) ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.tasks(id) on delete cascade,
  name text not null,
  status public.task_status not null default 'todo',
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  progress smallint not null default 0 check (progress between 0 and 100),
  budget numeric(14,2) not null default 0 check (budget >= 0),
  responsible_id uuid references public.profiles(id) on delete set null,
  sort_order integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_project_idx on public.tasks(project_id, sort_order);

-- ---------- Depenses ----------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  spent_on date not null default current_date,
  category text not null default 'general',
  description text not null default '',
  source public.entry_source not null default 'web',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists expenses_project_idx on public.expenses(project_id, spent_on desc);
create index if not exists expenses_task_idx on public.expenses(task_id);

-- ---------- Journal de terrain ----------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  entry_date date not null default current_date,
  content text not null check (char_length(content) between 1 and 5000),
  location text not null default '',
  source public.entry_source not null default 'web',
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists journal_project_idx on public.journal_entries(project_id, entry_date desc);

-- ---------- Registres (formulaires souples) ----------
create table if not exists public.register_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  register_type text not null,          -- ex : presence, materiel, incident, livraison
  entry_date date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  source public.entry_source not null default 'web',
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists register_project_idx on public.register_entries(project_id, entry_date desc);

-- ---------- updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------- Vue de synthese ----------
create or replace view public.project_stats
with (security_invoker = true) as
select
  p.id as project_id,
  p.budget,
  coalesce((select sum(e.amount) from public.expenses e where e.project_id = p.id), 0) as spent,
  coalesce((select count(*) from public.tasks t where t.project_id = p.id), 0) as task_count,
  coalesce((select count(*) from public.tasks t where t.project_id = p.id and t.status = 'done'), 0) as done_count,
  coalesce((
    select case when sum(t.budget) > 0
      then round(sum(t.progress * t.budget) / sum(t.budget))
      else round(avg(t.progress)) end
    from public.tasks t where t.project_id = p.id), 0) as progress,
  coalesce((
    select count(*) from public.tasks t
    where t.project_id = p.id and t.status <> 'done' and t.end_date < current_date), 0) as late_count
from public.projects p;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.expenses enable row level security;
alter table public.journal_entries enable row level security;
alter table public.register_entries enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = public.current_user_role());
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- projects
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated using (true);
drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- tasks
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated using (true);
drop policy if exists tasks_write on public.tasks;
create policy tasks_write on public.tasks for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- expenses
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses for select to authenticated using (true);
drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert to authenticated
  with check (public.can_submit() and created_by = auth.uid());
drop policy if exists expenses_edit on public.expenses;
create policy expenses_edit on public.expenses for update to authenticated
  using (public.is_editor()) with check (public.is_editor());
drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses for delete to authenticated using (public.is_editor());

-- journal
drop policy if exists journal_select on public.journal_entries;
create policy journal_select on public.journal_entries for select to authenticated using (true);
drop policy if exists journal_insert on public.journal_entries;
create policy journal_insert on public.journal_entries for insert to authenticated
  with check (public.can_submit() and author_id = auth.uid());
drop policy if exists journal_edit on public.journal_entries;
create policy journal_edit on public.journal_entries for update to authenticated
  using (public.is_editor() or author_id = auth.uid()) with check (public.is_editor() or author_id = auth.uid());
drop policy if exists journal_delete on public.journal_entries;
create policy journal_delete on public.journal_entries for delete to authenticated using (public.is_editor());

-- registers
drop policy if exists register_select on public.register_entries;
create policy register_select on public.register_entries for select to authenticated using (true);
drop policy if exists register_insert on public.register_entries;
create policy register_insert on public.register_entries for insert to authenticated
  with check (public.can_submit() and author_id = auth.uid());
drop policy if exists register_edit on public.register_entries;
create policy register_edit on public.register_entries for update to authenticated
  using (public.is_editor() or author_id = auth.uid()) with check (public.is_editor() or author_id = auth.uid());
drop policy if exists register_delete on public.register_entries;
create policy register_delete on public.register_entries for delete to authenticated using (public.is_editor());

-- Table de test de la session precedente : plus necessaire
drop table if exists public.healthcheck;

notify pgrst, 'reload schema';
