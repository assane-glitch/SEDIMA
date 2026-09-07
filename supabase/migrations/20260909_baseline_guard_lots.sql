-- Le verrou de la reference ne concerne que les taches feuilles : la reference d'un lot est
-- derivee de ses taches (lot_recompute) et doit pouvoir etre recalculee librement.
create or replace function public.baseline_guard()
returns trigger language plpgsql as $$
begin
  if (new.baseline_start is distinct from old.baseline_start or new.baseline_end is distinct from old.baseline_end)
     and coalesce(current_setting('sedima.baseline_unlock', true), '') <> 'on'
     and not exists (select 1 from public.tasks c where c.parent_id = new.id) then
    raise exception 'Le planning de reference ne se modifie que par une demande de changement approuvee (registre des changements).';
  end if;
  return new;
end $$;
