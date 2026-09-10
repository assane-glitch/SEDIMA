-- Verrou de la reference d'un projet : quand il est pose, la structure des lots et taches, leurs noms,
-- responsables et budgets ne bougent plus ; seul un administrateur peut le lever (Parametres du projet),
-- puis le reposer. Le gel de la reference (freeze_baseline) pose le verrou. Idempotent.

alter table public.projects add column if not exists baseline_locked boolean not null default true;
alter table public.projects add column if not exists baseline_unlocked_by uuid references public.profiles(id) on delete set null;
alter table public.projects add column if not exists baseline_unlocked_at timestamptz;

-- Seul un administrateur change l'etat du verrou (les editeurs peuvent modifier la fiche projet par ailleurs)
create or replace function public.baseline_lock_guard()
returns trigger language plpgsql as $$
begin
  if (new.baseline_locked is distinct from old.baseline_locked or new.baseline_unlocked_by is distinct from old.baseline_unlocked_by)
     and public.current_user_role() <> 'admin' then
    raise exception 'Seul un administrateur peut verrouiller ou deverrouiller la reference du projet.';
  end if;
  return new;
end $$;
drop trigger if exists baseline_lock_guard on public.projects;
create trigger baseline_lock_guard before update on public.projects for each row execute function public.baseline_lock_guard();

-- Garde de structure sur les taches : insertion, suppression, nom, lot, responsable et budget (taches feuilles)
create or replace function public.baseline_scope_guard()
returns trigger language plpgsql as $$
declare locked boolean;
begin
  if coalesce(current_setting('sedima.baseline_unlock', true), '') = 'on' then
    if tg_op = 'DELETE' then return old; end if; return new;
  end if;
  select p.baseline_locked into locked from public.projects p where p.id = coalesce(new.project_id, old.project_id);
  if not coalesce(locked, false) then
    if tg_op = 'DELETE' then return old; end if; return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'Reference verrouillee : ajouter un lot ou une tache demande son deverrouillage par un administrateur (Parametres du projet).';
  elsif tg_op = 'DELETE' then
    raise exception 'Reference verrouillee : supprimer un lot ou une tache demande son deverrouillage par un administrateur (Parametres du projet).';
  elsif new.name is distinct from old.name
     or new.parent_id is distinct from old.parent_id
     or new.responsible_id is distinct from old.responsible_id
     or new.responsible_role is distinct from old.responsible_role
     or (new.budget is distinct from old.budget and not exists (select 1 from public.tasks c where c.parent_id = new.id)) then
    raise exception 'Reference verrouillee : nom, lot, responsable et budget ne se modifient qu''apres deverrouillage par un administrateur (Parametres du projet).';
  end if;
  return new;
end $$;
drop trigger if exists baseline_scope_guard on public.tasks;
create trigger baseline_scope_guard before insert or update or delete on public.tasks for each row execute function public.baseline_scope_guard();

-- Dates de reference : modifiables par demande de changement approuvee, ou directement quand le projet est deverrouille
create or replace function public.baseline_guard()
returns trigger language plpgsql as $$
begin
  if (new.baseline_start is distinct from old.baseline_start or new.baseline_end is distinct from old.baseline_end)
     and coalesce(current_setting('sedima.baseline_unlock', true), '') <> 'on'
     and not exists (select 1 from public.tasks c where c.parent_id = new.id)
     and coalesce((select p.baseline_locked from public.projects p where p.id = new.project_id), true) then
    raise exception 'Le planning de reference ne se modifie que par une demande de changement approuvee (registre des changements), ou apres deverrouillage par un administrateur.';
  end if;
  return new;
end $$;

-- Verrouiller ou deverrouiller (administrateur)
create or replace function public.set_baseline_lock(p_project uuid, p_locked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_user_role() <> 'admin' then raise exception 'Seul un administrateur peut verrouiller ou deverrouiller la reference du projet.'; end if;
  update public.projects
     set baseline_locked = p_locked,
         baseline_unlocked_by = case when p_locked then null else auth.uid() end,
         baseline_unlocked_at = case when p_locked then null else now() end
   where id = p_project;
end $$;

-- Aligner la reference sur le planning actuel (administrateur, projet deverrouille) : dates de reference des taches feuilles
create or replace function public.align_baseline(p_project uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer; locked boolean;
begin
  if public.current_user_role() <> 'admin' then raise exception 'Seul un administrateur peut aligner la reference.'; end if;
  select baseline_locked into locked from public.projects where id = p_project;
  if coalesce(locked, true) then raise exception 'Deverrouillez d''abord la reference du projet.'; end if;
  perform set_config('sedima.baseline_unlock', 'on', true);
  update public.tasks set baseline_start = start_date, baseline_end = end_date
   where project_id = p_project and not exists (select 1 from public.tasks c where c.parent_id = tasks.id)
     and (baseline_start is distinct from start_date or baseline_end is distinct from end_date);
  get diagnostics n = row_count;
  return n;
end $$;

-- Le gel initial pose le verrou
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
  update public.projects set baseline_locked = true, baseline_unlocked_by = null, baseline_unlocked_at = null where id = p_project;
  return n;
end $$;
