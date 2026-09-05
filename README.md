# SEDIMA

Application de gestion de projets : portefeuille, Gantt avec budget et depenses, journal et registres de terrain saisis depuis mobile.

- Web : Next.js 15, TypeScript, Tailwind v4, deploye sur Vercel (branche `main` = production, autres branches = previews)
- Donnees : Supabase (Postgres, Auth, Row Level Security)
- Mobile : application web installable (PWA) sur `/field`, pas de store necessaire

## Roles

| Role | Droits |
|---|---|
| admin | tout, plus invitation et roles des utilisateurs |
| manager | projets, taches, depenses, journal, registres |
| field | saisie journal, registres, depenses depuis le mobile |
| viewer | lecture seule |

## Mise en service

1. **Base de donnees** : Supabase > SQL Editor > coller `supabase/migrations/20260905_schema.sql` > Run.
2. **Premier administrateur** : Supabase > Authentication > Users > Add user (email + mot de passe, cocher "Auto confirm"). Le premier compte cree devient automatiquement `admin`.
3. **URLs d'authentification** : Supabase > Authentication > URL Configuration : Site URL = URL de production Vercel ; Redirect URLs = `https://<domaine>/auth/callback` et `http://localhost:3000/auth/callback`.
4. **Variables Vercel** (Settings > Environment Variables) : `SUPABASE_URL`, `SUPABASE_ANON_KEY` (cle publishable), `SUPABASE_SERVICE_ROLE_KEY` (cle secrete, Production seulement, utilisee pour les invitations).
5. Se connecter, puis Utilisateurs > Inviter pour ajouter les chefs de projet, lecteurs et equipes terrain.

## Developpement local

```bash
cp .env.example .env.local        # remplir les cles
npm install
npm run dev                       # http://localhost:3000
npm run check                     # lint + typecheck avant de pousser
npm run check:connections         # verifie GitHub / Supabase / Vercel
```

## Structure

```
src/app/(app)/dashboard      portefeuille de projets
src/app/(app)/projects/[id]  Gantt, depenses, journal, registres, parametres
src/app/(app)/field          ecrans mobiles de saisie
src/app/(app)/admin/users    invitations et roles
src/components/gantt         diagramme de Gantt
supabase/migrations          schema SQL et policies RLS
```
