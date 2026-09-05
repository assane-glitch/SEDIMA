# Journal d'import du referentiel (execution 3)

Date (UTC) : 2026-09-05 14:39:19 UTC (debut) - 14:40:05 UTC (fin)
Projet Supabase : kfsnobycokmqfzfhubir
Methode : `python3 scripts/supabase-sql.py <argument>` (API de gestion Supabase, POST /v1/projects/kfsnobycokmqfzfhubir/database/query)
Variable SUPABASE_ACCESS_TOKEN : presente dans l'environnement de la session.
Script non modifie par cette session.

## Resultat des etapes

| Etape | Action | Heure (UTC) | Statut HTTP | Code de sortie | Resultat |
|---|---|---|---|---|---|
| 1 | `select current_database(), version()` | 14:39:19 | 201 | 0 | OK : `postgres`, PostgreSQL 17.6 on x86_64-pc-linux-gnu |
| 2 | Execution de supabase/migrations/20260905_step2b_import_model.sql | 14:39:28 | 201 | 0 | OK, aucun message d'erreur |
| 3 | Execution de supabase/seed/referentiel_2026_2030.sql (240 464 octets, une requete) | 14:39:38 - 14:39:41 | 201 | 0 | OK, aucun message d'erreur (environ 3 s) |
| 4 | Requete de controle (comptages) | 14:40:05 | 201 | 0 | OK, voir tableau de controle |

## Erreurs

Aucune. Toutes les etapes ont repondu HTTP 201 sans message d'erreur.

## Tableau de controle

| Cle | Attendu | Obtenu | Verdict |
|---|---|---|---|
| projets | 28 | 28 | conforme |
| lots | 150 | 150 | conforme |
| taches | 605 | 605 | conforme |
| dependances | 577 | 577 | conforme |
| tranches | 140 | 140 | conforme |
| chefs_lies | (non specifie) | 0 | informatif : aucun projet n'a de `manager_id` renseigne |

Requete executee :

```sql
select 'projets' k, count(*) n from public.projects
union all select 'lots', count(*) from public.tasks where parent_id is null and wbs_code is not null
union all select 'taches', count(*) from public.tasks where parent_id is not null
union all select 'dependances', count(*) from public.tasks where depends_on is not null
union all select 'tranches', count(*) from public.project_budget_years
union all select 'chefs_lies', count(*) from public.projects where manager_id is not null
```

## Etat de la base

Migration `20260905_step2b_import_model.sql` et seed `referentiel_2026_2030.sql` appliques avec succes. Les comptages correspondent exactement aux valeurs attendues.

## Historique

- Execution 1 et 2 : echec HTTP 403 (Cloudflare, error code 1010) du a l'User-Agent par defaut de Python, corrige par le commit 01249e3 (User-Agent explicite `sedima-supabase-sql/1.0`).
- Execution 3 (ce journal) : succes complet.
