-- Favoris : chaque utilisateur choisit ses projets favoris (visibles en premier sur son tableau de bord).
create table if not exists public.user_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);
alter table public.user_favorites enable row level security;
drop policy if exists favorites_own on public.user_favorites;
create policy favorites_own on public.user_favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
