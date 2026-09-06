"use client";
import { useState } from "react";
import { realignLinks } from "./actions";

export function RealignTool({ projects }: { projects: { id: string; code: string; name: string; toFix: number }[] }) {
  const [pid, setPid] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const total = projects.reduce((s, p) => s + p.toFix, 0);
  const sel = projects.find((p) => p.id === pid);
  const run = async () => {
    const n = sel ? sel.toFix : total;
    if (!confirm(`Recaler ${n} tache${n > 1 ? "s" : ""} liee${n > 1 ? "s" : ""} ${sel ? `du projet ${sel.code}` : "de tous les projets"} ? Les dates de fin glissent d'autant, la duree est conservee. Cette action est definitive.`)) return;
    setBusy(true); const r = await realignLinks(pid || null); setBusy(false);
    setMsg(r.error ? `Erreur : ${r.error}` : `${r.moved} tache${(r.moved ?? 0) > 1 ? "s" : ""} recalee${(r.moved ?? 0) > 1 ? "s" : ""}.`);
  };
  return (
    <div className="space-y-3">
      <select value={pid} onChange={(e) => setPid(e.target.value)} className="input"><option value="">Tous les projets ({total} a recaler)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name} ({p.toFix})</option>)}</select>
      <div className="flex items-center gap-3"><button onClick={run} disabled={busy || (sel ? sel.toFix === 0 : total === 0)} className="btn-primary">{busy ? "Recalage…" : "Recaler"}</button>{msg && <span className="text-[10.5px] text-ink-muted">{msg}</span>}</div>
    </div>
  );
}
