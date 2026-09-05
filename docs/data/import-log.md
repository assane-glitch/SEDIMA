# Journal d'import du referentiel (execution)

Date (UTC) : 2026-09-05 14:37:09 UTC
Projet Supabase : kfsnobycokmqfzfhubir
Methode : `python3 scripts/supabase-sql.py <argument>` (API de gestion Supabase, POST /v1/projects/kfsnobycokmqfzfhubir/database/query)
Variable SUPABASE_ACCESS_TOKEN : presente dans l'environnement de la session.

## Resultat des etapes

| Etape | Action | Statut HTTP | Resultat |
|---|---|---|---|
| 1 | `select current_database(), version()` | 403 | ECHEC (Cloudflare, error code 1010), reproduit a l'identique sur une seconde tentative |
| 2 | Execution de supabase/migrations/20260905_step2b_import_model.sql | non envoye | Non tente (etape 1 en echec) |
| 3 | Execution de supabase/seed/referentiel_2026_2030.sql | non envoye | Non tente (etape 1 en echec) |
| 4 | Requete de controle (comptages) | non envoye | Non tente (etape 1 en echec) |

## Erreur complete (etape 1)

Commande : `python3 scripts/supabase-sql.py "select current_database(), version()"`

Premiere tentative (2026-09-05 14:36:27 UTC) :

```
HTTP 403
error code: 1010
```

Seconde tentative (2026-09-05 14:37:09 UTC), resultat identique :

```
HTTP 403
error code: 1010
```

Code de sortie du script : 1.

## Analyse

- Le statut n'est ni 401 (jeton invalide) ni une erreur du proxy sortant de la session : le tunnel TLS a ete etabli et c'est le serveur api.supabase.com qui a repondu.
- Le corps « error code: 1010 » est la reponse Cloudflare « Access denied: the owner of this website has banned your access based on your browser's signature ». Le script envoie l'en-tete User-Agent par defaut de Python (`Python-urllib/3.11`), que le WAF Cloudflare devant api.supabase.com refuse.
- Le jeton n'a donc pas ete evalue : on ne peut rien conclure sur sa validite.

## Tableau de controle

Non disponible (requete non executee). Attendu : 28 projets, 150 lots, 605 taches, 577 dependances, 140 tranches.

## Etat de la base

Aucune requete n'a atteint la base ; aucune modification n'a ete appliquee par cette session.

## Piste de correction

Ajouter un en-tete `User-Agent` explicite (par exemple `sedima-supabase-sql/1.0`) dans la requete construite par scripts/supabase-sql.py, puis relancer la mission. Le script n'a pas ete modifie par cette session, conformement a la consigne. A defaut, les deux fichiers SQL, idempotents, peuvent etre executes manuellement dans Supabase > SQL Editor dans l'ordre :
1. supabase/migrations/20260905_step2b_import_model.sql
2. supabase/seed/referentiel_2026_2030.sql
