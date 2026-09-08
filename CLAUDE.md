# SEDIMA

Application de gestion de projets : Next.js 15 (App Router, TypeScript, Tailwind v4) + Supabase (Postgres, Auth, RLS), deployee sur Vercel.

## Commandes
- `npm run dev` : serveur local
- `npm run check` : lint + typecheck (a lancer avant chaque push)
- `npm run build` : build de production
- `npm run check:connections` : verifie GitHub / Supabase / Vercel

## Structure
- `src/app/(app)/` : pages authentifiees. dashboard, projects (colonnes par categorie ; `planning` et `budget` portefeuille ; `[id]/` avec onglets Apercu, planning, tasks, budget, events, journal, register, documents, changes, history, settings), tasks, forms (saisies terrain et boite de reception), documents, team, reports (rapport hebdo imprimable, export CSV), search, admin (users, lists, calendar, activity, tools), account
- `src/app/login`, `src/app/auth/callback` : authentification Supabase (invitation seulement)
- `src/lib/` : `supabase/` (clients serveur, navigateur, admin ; le middleware est dans `src/middleware.ts`), `session.ts` (requireProfile, canEdit, canSubmit), `format.ts` (dates, semaines ISO, montants : utiliser ces helpers, ne pas les redefinir), `health.ts`, `gantt-rows.ts`, `reference.ts` (listes de reference, serveur) et `reference-types.ts` (cote client), `calendar.ts` (calendrier de travail, serveur) et `calendar-types.ts` (jours ouvres, feries, `workingDays`, cote client), `audit.ts`, `documents.ts`, `types.ts`
- `src/components/` : `layout/` (AppShell, Sidebar, GlobalSearch), `gantt/` (Gantt, TaskDrawer, MilestoneDrawer), `projects/` (ProjectCard, FavoriteStar), `tasks/` (TaskList, avec suppression en lot), `budget/`, `forms/`, `documents/`, `history/`, `ui/` (composants de base, `PageHeader` avec fil d'Ariane `crumbs`, hook `useExpandedLots`)
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
- Calendrier de travail commun a tous les projets : `calendar_settings` (jours ouvres ISO 1-7, heures par jour) et `holidays` (date, libelle, recurrent chaque annee), geres dans Administration > Calendrier. Le Gantt grise les jours chomes (week-ends a l'echelle jour, feries aux echelles jour, semaine et mois), le tiroir de tache affiche la duree en jours ouvres.
- Pages imbriquees (sous-pages d'Administration, formulaires, nouveau projet) : passer `crumbs` a `PageHeader` pour le fil d'Ariane et le bouton retour.

## Base de donnees depuis une session cloud
- `python3 scripts/supabase-sql.py <fichier.sql | "sql">` execute du SQL sur le projet Supabase via l'API de gestion (variable `SUPABASE_ACCESS_TOKEN` dans l'environnement cloud). Autorise par `.claude/settings.json`. Sortie limitee a 200 lignes.
- Ordre des scripts : `supabase/migrations/*` dans l'ordre des noms, puis `supabase/seed/*`. Tous sont idempotents.
- QA visuelle : utilisateur temporaire `qa.claude@sedima.test` cree en SQL, `NODE_USE_ENV_PROXY=1 npx next start -p 3100`, Playwright avec `/opt/pw-browsers/chromium` ; toujours supprimer l'utilisateur et les donnees de test ensuite.

## Conventions de travail avec le proprietaire
- Pousser directement sur `main` quand il dit "ok main" ; sinon, proposer avant de pousser.
- Ne jamais afficher de secrets dans le chat (token Vercel, cle service role, token Supabase).
- Ne pas modifier les donnees de production au-dela de ce qui est demande ; toute operation de masse (realignement, gel de reference, correction de dates) se fait sur demande explicite, projet par projet si demande.
- Apres chaque QA visuelle : supprimer l'utilisateur `qa.claude@sedima.test`, les lignes de test (taches, depenses, demandes de changement, documents) et remettre les sequences (`expense_seq`, `change_request_seq`) a leur valeur.
- Le bac a sable ne joint pas le stockage Supabase depuis le navigateur : valider les envois de fichiers avec supabase-js depuis Node.
- Message de commit en francais, descriptif, avec les trailers Co-Authored-By et Claude-Session.

## Etat et pistes (mis a jour le 2026-09-08)
- Derniers ajouts : suppression en lot des taches ; lots replies par defaut avec etat memorise (`useExpandedLots`) ; echelles du Gantt (Trimestre = trimestres / mois, Mois = mois / semaines) ; calendrier de travail (migration `20260910_calendar.sql`, appliquee en production) ; fil d'Ariane avec bouton retour sur les pages imbriquees. Aucune tache en cours.
- QA visuelle : l'utilisateur `qa.claude@sedima.test` se cree en SQL dans `auth.users` avec `invited_at` renseigne, `raw_user_meta_data` `{"full_name","role"}`, mot de passe via `crypt(..., gen_salt('bf'))` et les colonnes de jetons (`confirmation_token`, `recovery_token`, `email_change*`, `phone_change*`, `reauthentication_token`) a chaine vide, sinon la connexion echoue. Playwright n'est pas une dependance du projet : installer `playwright-core` dans le dossier de travail temporaire.
- Pistes non demandees, a l'appreciation du proprietaire : inviter les autres chefs de projet ; tester l'envoi de photos depuis un telephone sur les formulaires terrain ; reserver l'export CSV aux roles manager et admin ; passe globale sur les accents de l'interface ; plafond de 500 lignes dans l'historique d'une tache ; policy `documents_update` qui laisse l'auteur changer le projet d'un document.
