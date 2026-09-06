"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export type InboxKind = "journal" | "register" | "expense";
export interface InboxItem {
  id: string; kind: InboxKind; at: string; date: string; projectId: string; projectCode: string; projectName: string;
  authorId: string | null; author: string; title: string; detail: string; amount?: string; tone?: string; status?: string; source: string;
}
const KIND: Record<InboxKind, { label: string; tone: string; type: string }> = {
  journal: { label: "Journal", tone: "info", type: "journal" }, register: { label: "Registre", tone: "neutral", type: "registers" }, expense: { label: "Depense", tone: "warn", type: "expenses" },
};
const PERIODS = [{ v: 7, l: "7 jours" }, { v: 30, l: "30 jours" }, { v: 90, l: "90 jours" }, { v: 0, l: "Tout" }];
const SEEN_KEY = "sedima.forms.seen";

/** Mes saisies (les miennes) ou boite de reception (toute l'equipe), avec filtres et marqueur "nouveau". */
export function Inbox({ items, meId, defaultMode, projects, authors }: { items: InboxItem[]; meId: string; defaultMode: "mine" | "all"; projects: { id: string; code: string; name: string }[]; authors: { id: string; name: string }[] }) {
  const [mode, setMode] = useState<"mine" | "all">(defaultMode);
  const [kind, setKind] = useState<InboxKind | "">("");
  const [project, setProject] = useState("");
  const [author, setAuthor] = useState("");
  const [days, setDays] = useState(30);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => {
    try { setSeen(localStorage.getItem(SEEN_KEY)); localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch {}
  }, []);
  const since = days ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : "";
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => (mode === "all" || i.authorId === meId) && (!kind || i.kind === kind) && (!project || i.projectId === project) && (!author || i.authorId === author)
      && (!since || i.at.slice(0, 10) >= since) && (!needle || `${i.title} ${i.detail} ${i.projectCode} ${i.projectName} ${i.author}`.toLowerCase().includes(needle)));
  }, [items, mode, meId, kind, project, author, since, q]);
  const fresh = (i: InboxItem) => mode === "all" && !!seen && i.at > seen && i.authorId !== meId;
  const newCount = items.filter((i) => !!seen && i.at > seen && i.authorId !== meId).length;
  const mineCount = items.filter((i) => i.authorId === meId).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-line">
          <button onClick={() => setMode("mine")} className={`px-2.5 py-[3px] text-[10px] font-semibold ${mode === "mine" ? "bg-ink text-surface" : "bg-surface text-ink-body hover:bg-surface-sub"}`}>Mes saisies ({mineCount})</button>
          <button onClick={() => setMode("all")} className={`px-2.5 py-[3px] text-[10px] font-semibold ${mode === "all" ? "bg-ink text-surface" : "bg-surface text-ink-body hover:bg-surface-sub"}`}>Boite de reception{newCount > 0 && <span className="ml-1.5 rounded-full bg-brand px-1.5 text-[9px] text-surface">{newCount}</span>}</button>
        </div>
        <span className="mx-1 hidden h-4 w-px bg-line-hair sm:inline-block" />
        {(["", "journal", "register", "expense"] as const).map((k) => <button key={k} onClick={() => setKind(k)} className={`filter-chip ${kind === k ? "filter-chip-active" : ""}`}>{k ? KIND[k].label : "Tous types"}</button>)}
        <span className="mx-1 hidden h-4 w-px bg-line-hair sm:inline-block" />
        {PERIODS.map((p) => <button key={p.v} onClick={() => setDays(p.v)} className={`filter-chip ${days === p.v ? "filter-chip-active" : ""}`}>{p.l}</button>)}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="input !w-56" />
        <select value={project} onChange={(e) => setProject(e.target.value)} className="input !w-56"><option value="">Tous les projets</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select>
        {mode === "all" && <select value={author} onChange={(e) => setAuthor(e.target.value)} className="input !w-48"><option value="">Tous les auteurs</option>{authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
        <span className="ml-auto text-[10px] text-ink-muted">{filtered.length} saisie{filtered.length > 1 ? "s" : ""}</span>
      </div>
      <div className="card divide-y divide-line-light">
        {filtered.slice(0, limit).map((i) => (
          <Link key={`${i.kind}-${i.id}`} href={`/projects/${i.projectId}/events?type=${KIND[i.kind].type}`} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2.5 text-[10.5px] hover:bg-surface-alt sm:flex-nowrap">
            <div className="w-1.5 pt-1.5">{fresh(i) && <span className="block h-1.5 w-1.5 rounded-full bg-brand" title="Nouveau depuis votre derniere visite" />}</div>
            <div className="w-16 shrink-0"><Badge tone={KIND[i.kind].tone}>{KIND[i.kind].label}</Badge></div>
            <div className="w-14 shrink-0 font-semibold" title={i.projectName}>{i.projectCode}</div>
            <div className="w-[70px] shrink-0 tabular-nums text-ink-muted">{formatDate(i.date)}</div>
            <div className="order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto">
              <div className="truncate font-semibold text-ink">{i.title}</div>
              {i.detail && <div className="truncate text-ink-muted">{i.detail}</div>}
            </div>
            {i.amount && <div className="ml-auto shrink-0 tabular-nums font-semibold sm:ml-0">{i.amount}</div>}
            {i.status && <div className="hidden shrink-0 sm:block"><Badge tone={i.tone}>{i.status}</Badge></div>}
            <div className="hidden w-28 shrink-0 truncate text-right text-ink-muted md:block" title={i.author}>{mode === "all" ? i.author : i.source === "mobile" ? "mobile" : "web"}</div>
          </Link>
        ))}
        {filtered.length === 0 && <div className="px-4 py-8 text-center text-ink-faint">Aucune saisie sur cette periode.</div>}
        {filtered.length > limit && <button onClick={() => setLimit((l) => l + 50)} className="w-full py-2 text-center text-[10.5px] font-semibold text-ink-muted hover:bg-surface-alt">Afficher plus ({filtered.length - limit} restantes)</button>}
      </div>
    </div>
  );
}
