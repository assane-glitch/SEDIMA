-- Table de test de connectivite. Lecture et insertion ouvertes a la cle publishable,
-- volontairement limitees a un message court. A supprimer une fois le vrai schema en place.
create table if not exists public.healthcheck (
  id bigint generated always as identity primary key,
  message text not null check (char_length(message) <= 200),
  created_at timestamptz not null default now()
);

alter table public.healthcheck enable row level security;

drop policy if exists "healthcheck_anon_select" on public.healthcheck;
create policy "healthcheck_anon_select" on public.healthcheck
  for select to anon using (true);

drop policy if exists "healthcheck_anon_insert" on public.healthcheck;
create policy "healthcheck_anon_insert" on public.healthcheck
  for insert to anon with check (true);

-- Rafraichir le cache de schema de PostgREST pour que la table soit visible immediatement
notify pgrst, 'reload schema';
