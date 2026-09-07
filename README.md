# SEDIMA

Application de gestion de projets : portefeuille, Gantt avec budget et depenses, journal et registres de terrain saisis depuis mobile.

- Web : Next.js 15, TypeScript, Tailwind v4, deploye sur Vercel (branche `main` = production, autres branches = previews)
- Donnees : Supabase (Postgres, Auth, Row Level Security)
- Mobile : application web installable (PWA), menu Formulaires (journal, registres, depenses, photos), pas de store necessaire

## Roles

| Role | Droits |
|---|---|
| admin | tout, plus invitation et roles des utilisateurs |
| manager | projets, taches, depenses, journal, registres |
| field | saisie journal, registres, depenses et photos depuis le mobile |
| viewer | lecture seule |

## Mise en service

1. **Base de donnees** : Supabase > SQL Editor > executer les fichiers de `supabase/migrations/` dans l'ordre des noms, puis `supabase/seed/referentiel_2026_2030.sql` (ou `python3 scripts/supabase-sql.py <fichier>` depuis une session cloud).
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
src/app/(app)/dashboard      tableau de bord (favoris, sante des projets, semaine, alertes)
src/app/(app)/projects       portefeuille en colonnes par categorie, planning et budget multi-projets
src/app/(app)/projects/[id]  apercu, planning (Gantt, reference, liens), taches, budget, evenements,
                             journal, registres, documents, changements (registre), historique, parametres
src/app/(app)/tasks          toutes les taches, filtres et tiroir de tache
src/app/(app)/forms          saisies terrain (journal, registre, depense) et boite de reception
src/app/(app)/documents      fichiers et photos, galerie et visionneuse
src/app/(app)/team           charge par personne
src/app/(app)/reports        rapport hebdomadaire imprimable, exports CSV
src/app/(app)/search         recherche globale
src/app/(app)/admin          utilisateurs, listes de reference, journal d'activite, outils
src/components/gantt         diagramme de Gantt et tiroir de tache
supabase/migrations          schema SQL, triggers metier et policies RLS
```
