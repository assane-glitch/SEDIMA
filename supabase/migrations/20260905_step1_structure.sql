-- SEDIMA etape 1 : categories de projet, jalons, documents, historique des modifications.
-- A executer dans Supabase > SQL Editor apres 20260905_schema.sql. Idempotent.

-- ---------- Categories de projet ----------
do $$ begin
  create type public.project_category as enum ('oac_poussins', 'poulet_chair', 'oeufs_table', 'industriels', 'autres');
exception when duplicate_object then null; end $$;

alter table public.projects add column if not exists category public.project_category not null default 'autres';
create index if not exists projects_category_idx on public.projects(category);

-- ---------- Jalons ----------
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  due_date date not null,
  reached_on date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists milestones_project_idx on public.milestones(project_id, due_date);
drop trigger if exists milestones_updated_at on public.milestones;
create trigger milestones_updated_at before update on public.milestones
  for each row execute function public.set_updated_at();

alter table public.milestones enable row level security;
drop policy if exists milestones_select on public.milestones;
create policy milestones_select on public.milestones for select to authenticated using (true);
drop policy if exists milestones_write on public.milestones;
create policy milestones_write on public.milestones for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- ---------- Documents ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  register_entry_id uuid references public.register_entries(id) on delete set null,
  name text not null,
  doc_type text not null default 'autre',   -- photo, plan, contrat, facture, rapport, autre
  storage_path text not null unique,        -- chemin dans le bucket "documents"
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  tags text[] not null default '{}',
  source public.entry_source not null default 'web',
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists documents_project_idx on public.documents(project_id, created_at desc);
create index if not exists documents_type_idx on public.documents(doc_type);

alter table public.documents enable row level security;
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select to authenticated using (true);
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert to authenticated
  with check (public.can_submit() and uploaded_by = auth.uid());
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents for update to authenticated
  using (public.is_editor() or uploaded_by = auth.uid()) with check (public.is_editor() or uploaded_by = auth.uid());
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents for delete to authenticated using (public.is_editor());

-- Bucket de stockage prive : lecture pour tout utilisateur connecte, ecriture selon le role
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do nothing;

drop policy if exists "documents_bucket_read" on storage.objects;
create policy "documents_bucket_read" on storage.objects for select to authenticated
  using (bucket_id = 'documents');
drop policy if exists "documents_bucket_insert" on storage.objects;
create policy "documents_bucket_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.can_submit());
drop policy if exists "documents_bucket_delete" on storage.objects;
create policy "documents_bucket_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_editor());

-- ---------- Historique des modifications ----------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  project_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[]
);
create index if not exists audit_project_idx on public.audit_log(project_id, changed_at desc);
create index if not exists audit_record_idx on public.audit_log(table_name, record_id, changed_at desc);

create or replace function public.audit_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_j jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_j jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  rec_id uuid := coalesce((new_j->>'id')::uuid, (old_j->>'id')::uuid);
  proj_id uuid := coalesce(
    case when tg_table_name = 'projects' then rec_id end,
    (new_j->>'project_id')::uuid, (old_j->>'project_id')::uuid);
  fields text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(key) into fields
    from jsonb_each(new_j) n
    where n.value is distinct from old_j->n.key and n.key not in ('updated_at');
    if fields is null then return new; end if;   -- rien de significatif n'a change
  end if;
  insert into public.audit_log (table_name, record_id, project_id, action, changed_by, old_data, new_data, changed_fields)
  values (tg_table_name, rec_id, proj_id, lower(tg_op), auth.uid(), old_j, new_j, fields);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['projects','tasks','milestones','expenses','journal_entries','register_entries','documents']
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_changes()', t);
  end loop;
end $$;

alter table public.audit_log enable row level security;
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated using (true);
-- Aucune policy d'ecriture : seul le trigger (security definer) ecrit dans l'historique.

-- ---------- Vue de synthese : ajoute la categorie et les jalons ----------
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
    where t.project_id = p.id and t.status <> 'done' and t.end_date < current_date), 0) as late_count,
  coalesce((select count(*) from public.milestones m where m.project_id = p.id), 0) as milestone_count,
  coalesce((select count(*) from public.milestones m where m.project_id = p.id and m.reached_on is not null), 0) as milestone_reached,
  (select min(m.due_date) from public.milestones m where m.project_id = p.id and m.reached_on is null and m.due_date >= current_date) as next_milestone
from public.projects p;

notify pgrst, 'reload schema';
