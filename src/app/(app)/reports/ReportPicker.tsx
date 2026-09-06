"use client";
import Link from "next/link";
import { useState } from "react";

export function ReportPicker({ projects, exports }: { projects: { id: string; code: string; name: string }[]; exports?: { type: string; label: string; hint: string }[] }) {
  const [pid, setPid] = useState("");
  const q = pid ? `?project=${pid}` : "";
  return (
    <div className="space-y-3">
      <select value={pid} onChange={(e) => setPid(e.target.value)} className="input"><option value="">Tout le portefeuille</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select>
      {exports ? (
        <div className="divide-y divide-line-light rounded-md border border-line-hair">
          {exports.map((e) => <div key={e.type} className="flex items-center justify-between gap-3 px-3 py-2 text-[10.5px]"><div><div className="font-semibold">{e.label}</div><div className="text-ink-faint">{e.hint}</div></div><a href={`/reports/export?type=${e.type}${pid ? `&project=${pid}` : ""}`} className="btn-secondary shrink-0">Telecharger CSV</a></div>)}
        </div>
      ) : (
        <div className="flex gap-2"><Link href={`/reports/weekly${q}`} className="btn-primary">Ouvrir le rapport</Link><Link href={`/reports/weekly${q}&print=1`.replace("weekly&", "weekly?")} className="btn-secondary">Ouvrir et imprimer</Link></div>
      )}
    </div>
  );
}
