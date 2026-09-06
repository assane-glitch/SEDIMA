-- Reference (planning de base) et dates reelles sur les taches. Idempotent.
alter table public.tasks
  add column if not exists baseline_start date,
  add column if not exists baseline_end date,
  add column if not exists actual_start date,
  add column if not exists actual_end date;
-- La reference initiale est le planning importe du referentiel
update public.tasks set baseline_start = start_date, baseline_end = end_date where baseline_start is null;
notify pgrst, 'reload schema';
