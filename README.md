# SEDIMA

Squelette initial du projet. Architecture cible : GitHub (code) -> Vercel (deploiement) -> Supabase (base de donnees, auth).

## Verifier les connexions

```bash
cp .env.example .env.local           # cles de l'application
cp .env.check.example .env.check.local  # tokens du script de verification
node scripts/check-connections.mjs
```

Le script teste GitHub, l'API REST et Auth de Supabase, Postgres (si `DATABASE_URL` est renseigne) et l'API Vercel.
Il ne necessite aucune dependance (Node 18+).
