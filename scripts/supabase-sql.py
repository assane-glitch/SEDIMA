#!/usr/bin/env python3
"""Execute un fichier SQL (ou une requete) sur le projet Supabase via l'API de gestion.
Usage : python3 scripts/supabase-sql.py <fichier.sql | "select ...">
Necessite SUPABASE_ACCESS_TOKEN (token personnel) et, optionnellement, SUPABASE_PROJECT_REF."""
import json, os, sys, urllib.request, urllib.error

REF = os.environ.get("SUPABASE_PROJECT_REF", "kfsnobycokmqfzfhubir")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
if not TOKEN:
    sys.exit("SUPABASE_ACCESS_TOKEN manquant")
if len(sys.argv) < 2:
    sys.exit(__doc__)
arg = sys.argv[1]
sql = open(arg, encoding="utf-8").read() if os.path.exists(arg) else arg

req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{REF}/database/query",
    data=json.dumps({"query": sql}).encode(),
    headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=300) as r:
        body = r.read().decode()
        print(f"HTTP {r.status}")
        try:
            data = json.loads(body)
            if isinstance(data, list):
                for row in data[:200]:
                    print(row)
                if len(data) > 200:
                    print(f"... {len(data) - 200} lignes supplementaires")
            else:
                print(json.dumps(data, ensure_ascii=False)[:2000])
        except json.JSONDecodeError:
            print(body[:2000])
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}")
    print(e.read().decode()[:3000])
    sys.exit(1)
