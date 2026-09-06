-- Listes de reference modifiables dans Administration (categories, statuts, types de registre, methodes...).
-- Le statut des depenses devient du texte pour pouvoir suivre la liste. Idempotent.

create table if not exists public.reference_lists (
  id uuid primary key default gen_random_uuid(),
  list_key text not null,                -- expense_category, expense_status, register_type, estimate_method, confidence, responsible_role, doc_type
  value text not null,                   -- cle stockee dans les enregistrements
  label text not null,                   -- libelle affiche
  sort_order integer not null default 0,
  active boolean not null default true,
  meta jsonb not null default '{}'::jsonb, -- ex : champs d'un type de registre, ton d'un statut
  unique (list_key, value)
);
alter table public.reference_lists enable row level security;
drop policy if exists reflists_select on public.reference_lists;
create policy reflists_select on public.reference_lists for select to authenticated using (true);
drop policy if exists reflists_admin on public.reference_lists;
create policy reflists_admin on public.reference_lists for all to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- Statut de depense : texte libre pilote par la liste, defaut DA emise
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'status' and udt_name = 'expense_status') then
    drop view if exists public.project_stats;
    alter table public.expenses alter column status drop default;
    alter table public.expenses alter column status type text using status::text;
    drop type public.expense_status;
  end if;
end $$;
alter table public.expenses alter column status set default 'da_emise';

-- Vue de synthese recreee (identique a 20260906_expense_journal.sql)
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


-- Valeurs initiales (n'ecrase pas les modifications faites dans Administration)
insert into public.reference_lists (list_key, value, label, sort_order, meta) values
  ('expense_category', 'materiaux', 'Materiaux', 10, '{}'), ('expense_category', 'main_oeuvre', 'Main d''oeuvre', 20, '{}'),
  ('expense_category', 'equipement', 'Equipement', 30, '{}'), ('expense_category', 'transport', 'Transport', 40, '{}'),
  ('expense_category', 'services', 'Services', 50, '{}'), ('expense_category', 'etudes', 'Etudes', 60, '{}'), ('expense_category', 'general', 'General', 70, '{}'),
  ('expense_status', 'da_emise', 'DA emise', 10, '{"tone":"neutral"}'), ('expense_status', 'commandee', 'Commandee', 20, '{"tone":"info"}'),
  ('expense_status', 'livree', 'Livree', 30, '{"tone":"info"}'), ('expense_status', 'facturee', 'Facturee', 40, '{"tone":"warn"}'),
  ('expense_status', 'payee', 'Payee', 50, '{"tone":"ok"}'), ('expense_status', 'annulee', 'Annulee', 60, '{"tone":"alert","excluded":true}'),
  ('register_type', 'presence', 'Presence', 10, '{"fields":[{"key":"personnes","label":"Nombre de personnes","type":"number"},{"key":"equipe","label":"Equipe","type":"text"}]}'),
  ('register_type', 'materiel', 'Materiel', 20, '{"fields":[{"key":"designation","label":"Designation","type":"text"},{"key":"quantite","label":"Quantite","type":"number"},{"key":"etat","label":"Etat","type":"text"}]}'),
  ('register_type', 'livraison', 'Livraison', 30, '{"fields":[{"key":"fournisseur","label":"Fournisseur","type":"text"},{"key":"designation","label":"Designation","type":"text"},{"key":"quantite","label":"Quantite","type":"number"}]}'),
  ('register_type', 'incident', 'Incident', 40, '{"fields":[{"key":"gravite","label":"Gravite (1-5)","type":"number"},{"key":"description","label":"Description","type":"text"}]}'),
  ('estimate_method', 'Devis fournisseur', 'Devis fournisseur', 10, '{}'), ('estimate_method', 'Contrat', 'Contrat', 20, '{}'),
  ('estimate_method', 'Ratio', 'Ratio', 30, '{}'), ('estimate_method', 'Avis d''expert', 'Avis d''expert', 40, '{}'),
  ('confidence', 'Élevé', 'Eleve', 10, '{}'), ('confidence', 'Moyen', 'Moyen', 20, '{}'), ('confidence', 'Faible', 'Faible', 30, '{}'),
  ('responsible_role', 'Chef de projet', 'Chef de projet', 10, '{}'), ('responsible_role', 'Conducteur de travaux', 'Conducteur de travaux', 20, '{}'),
  ('responsible_role', 'Responsable technique', 'Responsable technique', 30, '{}'), ('responsible_role', 'Responsable production', 'Responsable production', 40, '{}'),
  ('responsible_role', 'Responsable maintenance', 'Responsable maintenance', 50, '{}'), ('responsible_role', 'Responsable technique élevage', 'Responsable technique elevage', 60, '{}'),
  ('responsible_role', 'Responsable abattoir', 'Responsable abattoir', 70, '{}'), ('responsible_role', 'Responsable logistique', 'Responsable logistique', 80, '{}'),
  ('doc_type', 'photo', 'Photo', 10, '{}'), ('doc_type', 'plan', 'Plan', 20, '{}'), ('doc_type', 'contrat', 'Contrat', 30, '{}'),
  ('doc_type', 'facture', 'Facture', 40, '{}'), ('doc_type', 'rapport', 'Rapport', 50, '{}'), ('doc_type', 'autre', 'Autre', 60, '{}')
on conflict (list_key, value) do nothing;

-- Historique des modifications sur les listes
drop trigger if exists audit_reference_lists on public.reference_lists;
create trigger audit_reference_lists after insert or update or delete on public.reference_lists for each row execute function public.audit_changes();

notify pgrst, 'reload schema';
