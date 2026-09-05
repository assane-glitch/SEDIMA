# SEDIMA

Application de gestion de projets : Next.js 15 (App Router, TypeScript, Tailwind v4) + Supabase (Postgres, Auth, RLS), deployee sur Vercel.

## Commandes
- `npm run dev` : serveur local
- `npm run check` : lint + typecheck (a lancer avant chaque push)
- `npm run build` : build de production
- `npm run check:connections` : verifie GitHub / Supabase / Vercel

## Structure
- `src/app/(app)/` : pages authentifiees (dashboard, projets, gantt, terrain, admin)
- `src/app/login`, `src/app/auth/callback` : authentification Supabase
- `src/lib/supabase/` : clients serveur / navigateur / middleware
- `src/components/gantt/` : diagramme de Gantt
- `supabase/migrations/` : schema SQL, a executer dans l'editeur SQL Supabase (pas de CLI branchee)

## Regles
- Roles : admin, manager, viewer, field (colonne `profiles.role`). La securite est portee par les policies RLS, pas par l'UI.
- Variables : `SUPABASE_URL`, `SUPABASE_ANON_KEY` (cle publishable), `SUPABASE_SERVICE_ROLE_KEY` (serveur seulement, invitations). `next.config.ts` derive les `NEXT_PUBLIC_*`.
- Branche de production : `main`. Les previews Vercel se font sur les autres branches.
- UI en francais.
