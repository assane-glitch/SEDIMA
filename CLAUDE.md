# SEDIMA

Application de gestion de projets : Next.js 15 (App Router, TypeScript, Tailwind v4) + Supabase (Postgres, Auth, RLS), deployee sur Vercel.

## Commandes
- `npm run dev` : serveur local
- `npm run check` : lint + typecheck (a lancer avant chaque push)
- `npm run build` : build de production
- `npm run check:connections` : verifie GitHub / Supabase / Vercel

## Structure
- `src/app/(app)/` : pages authentifiees. dashboard, projects (colonnes par categorie ; `planning` et `budget` portefeuille ; `[id]/` avec onglets Apercu, planning, tasks, budget, events, journal, register, documents, changes, history, settings), tasks, forms (saisies terrain et boite de reception), documents, team, reports (rapport hebdo imprimable, export CSV), search, admin (users, lists, activity, tools), account
- `src/app/login`, `src/app/auth/callback` : authentification Supabase (invitation seulement)
- `src/lib/` : `supabase/` (clients serveur, navigateur, admin ; le middleware est dans `src/middleware.ts`), `session.ts` (requireProfile, canEdit, canSubmit), `format.ts` (dates, semaines ISO, montants : utiliser ces helpers, ne pas les redefinir), `health.ts`, `gantt-rows.ts`, `reference.ts` (listes de reference, serveur) et `reference-types.ts` (cote client), `audit.ts`, `documents.ts`, `types.ts`
- `src/components/` : `layout/` (AppShell, Sidebar, GlobalSearch), `gantt/` (Gantt, TaskDrawer, MilestoneDrawer), `projects/` (ProjectCard, FavoriteStar), `tasks/`, `budget/`, `forms/`, `documents/`, `history/`, `ui/`
- `supabase/migrations/` : schema SQL, idempotent, dans l'ordre des noms ; `supabase/seed/` : referentiel importe depuis `docs/data/*.xlsx` par `scripts/import-referentiel.py`

## Regles metier portees par la base (triggers, ne pas contourner)
- Lots : avancement, budget et dates calcules a partir des taches (`lot_recompute`, `lot_guard`, `lot_sync`).
- Liens : une tache liee demarre au plus tot le lundi suivant son predecesseur + `lag_weeks` (`task_link_guard`, `task_link_cascade`) ; une tache reellement demarree n'est plus recalee.
- Dates reelles : le planning suit `actual_start` / `actual_end` (`actuals_sync`), la reference ne bouge pas.
- Reference : fixee a l'insertion (`baseline_default`), gel initial par `freeze_baseline` si aucune reference, puis modifiable uniquement via une demande de changement approuvee (`change_requests`, `decide_change_request`, verrou `baseline_guard` sur les taches feuilles).
- Historique : `audit_log` alimente par trigger sur toutes les tables metier.

## Regles
- Roles : admin, manager, viewer, field (colonne `profiles.role`). La securite est portee par les policies RLS, pas par l'UI ; les actions serveur verifient en plus `canEdit` / `canSubmit`.
- Variables : `SUPABASE_URL`, `SUPABASE_ANON_KEY` (cle publishable), `SUPABASE_SERVICE_ROLE_KEY` (serveur seulement, invitations). `next.config.ts` derive les `NEXT_PUBLIC_*`.
- Branche de production : `main`. Les previews Vercel se font sur les autres branches.
- UI en francais, sans accents dans les chaines de code sauf libelles de navigation ; charte : fond gris, cartes blanches a bordure 1 px, pas d'ombre, bouton primaire anthracite, rouge `brand` reserve aux marqueurs, jaune `accent` pour le surlignage et les favoris, pictogrammes de categorie en rouge (`CategoryIcon`).
- Listes deroulantes metier (categories et statuts de depense, types de registre, methodes, roles, types de document) : table `reference_lists`, modifiables dans Administration.

## Base de donnees depuis une session cloud
- `python3 scripts/supabase-sql.py <fichier.sql | "sql">` execute du SQL sur le projet Supabase via l'API de gestion (variable `SUPABASE_ACCESS_TOKEN` dans l'environnement cloud). Autorise par `.claude/settings.json`. Sortie limitee a 200 lignes.
- Ordre des scripts : `supabase/migrations/*` dans l'ordre des noms, puis `supabase/seed/*`. Tous sont idempotents.
- QA visuelle : utilisateur temporaire `qa.claude@sedima.test` cree en SQL, `NODE_USE_ENV_PROXY=1 npx next start -p 3100`, Playwright avec `/opt/pw-browsers/chromium` ; toujours supprimer l'utilisateur et les donnees de test ensuite.
