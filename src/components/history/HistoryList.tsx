"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { describeAudit } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

export interface HistoryItem extends AuditEntry { author: string; projectCode?: string; currency?: string }
const TABLES: { v: string; l: string }[] = [{ v: "", l: "Tout" }, { v: "projects", l: "Projet" }, { v: "tasks", l: "Taches" }, { v: "milestones", l: "Jalons" }, { v: "expenses", l: "Depenses" }, { v: "journal_entries", l: "Journal" }, { v: "register_entries", l: "Registres" }, { v: "documents", l: "Documents" }];
const ACTIONS: Record<string, { l: string; cls: string }> = { insert: { l: "creation", cls: "bg-ok" }, update: { l: "modification", cls: "bg-ink" }, delete: { l: "suppression", cls: "bg-alert" } };
const PERIODS = [{ v: 0, l: "Tout" }, { v: 7, l: "7 jours" }, { v: 30, l: "30 jours" }, { v: 90, l: "90 jours" }];

/** Journal des modifications : qui a change quoi et quand, avec les valeurs avant et apres. */
export function HistoryList({ items, global }: { items: HistoryItem[]; global?: boolean }) {
  const [table, setTable] = useState(""); const [author, setAuthor] = useState(""); const [action, setAction] = useState(""); const [days, setDays] = useState(0); const [q, setQ] = useState(""); const [limit, setLimit] = useState(100);
  const authors = useMemo(() => Array.from(new Map(items.filter((i) => i.changed_by).map((i) => [i.changed_by!, i.author])).entries()).sort((a, b) => a[1].localeCompare(b[1], "fr")), [items]);
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : "";
  const filtered = useMemo(() => { const n = q.trim().toLowerCase(); return items.filter((i) => (!table || i.table_name === table) && (!author || i.changed_by === author) && (!action || i.action === action) && (!since || i.changed_at >= since) && (!n || JSON.stringify([i.new_data?.name, i.old_data?.name, i.new_data?.description, i.projectCode, i.author]).toLowerCase().includes(n))); }, [items, table, author, action, since, q]);
  const groups = useMemo(() => { const m = new Map<string, HistoryItem[]>(); for (const i of filtered.slice(0, limit)) { const d = i.changed_at.slice(0, 10); m.set(d, [...(m.get(d) ?? []), i]); } return [...m.entries()]; }, [filtered, limit]);
  const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {TABLES.map((t) => { const n = t.v ? items.filter((i) => i.table_name === t.v).length : items.length; return n || !t.v ? <button key={t.v} onClick={() => setTable(t.v)} className={`filter-chip ${table === t.v ? "filter-chip-active" : ""}`}>{t.l} <span className="opacity-60">{n}</span></button> : null; })}
        <span className="mx-1 h-4 w-px bg-line-hair" />
        {["", "insert", "update", "delete"].map((a) => <button key={a} onClick={() => setAction(a)} className={`filter-chip ${action === a ? "filter-chip-active" : ""}`}>{a ? ACTIONS[a].l : "Toutes actions"}</button>)}
        <span className="mx-1 h-4 w-px bg-line-hair" />
        {PERIODS.map((p) => <button key={p.v} onClick={() => setDays(p.v)} className={`filter-chip ${days === p.v ? "filter-chip-active" : ""}`}>{p.l}</button>)}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="input !w-56" />
        {authors.length > 1 && <select value={author} onChange={(e) => setAuthor(e.target.value)} className="input !w-48"><option value="">Tous les auteurs</option>{authors.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>}
        <span className="ml-auto text-[10px] text-ink-muted">{filtered.length} / {items.length} modifications</span>
      </div>
      <div className="card">
        {groups.length === 0 && <div className="px-4 py-8 text-center text-[10.5px] text-ink-faint">Aucune modification.</div>}
        {groups.map(([day, list]) => (
          <div key={day}>
            <div className="sticky top-0 z-10 border-b border-line-hair bg-thead px-4 py-1.5 text-[9px] font-bold uppercase tracking-[.06em] text-ink-faint">{formatDate(day)} <span className="font-normal">· {list.length}</span></div>
            <div className="divide-y divide-line-light">
              {list.map((i) => { const d = describeAudit(i, i.currency); return (
                <div key={i.id} className="flex items-start gap-3 px-4 py-2 text-[10.5px]">
                  <span className="w-10 shrink-0 pt-px tabular-nums text-ink-faint">{time(i.changed_at)}</span>
                  <span className={`mt-[5px] dot ${ACTIONS[i.action]?.cls ?? "bg-neutral-dot"}`} title={ACTIONS[i.action]?.l} />
                  {global && <span className="w-12 shrink-0 font-semibold">{i.project_id ? <Link href={`/projects/${i.project_id}/history`} className="hover:underline">{i.projectCode ?? "—"}</Link> : "—"}</span>}
                  <div className="min-w-0 flex-1">
                    <div><span className="font-semibold text-ink">{i.author}</span> <span className="text-ink-body">{d.what}</span></div>
                    {d.details.length > 0 && <div className="mt-0.5 text-ink-muted">{d.details.map((x, j) => <span key={j} className="mr-3 inline-block">{x}</span>)}</div>}
                  </div>
                </div>
              ); })}
            </div>
          </div>
        ))}
        {filtered.length > limit && <button onClick={() => setLimit((l) => l + 100)} className="w-full py-2 text-center text-[10.5px] font-semibold text-ink-muted hover:bg-surface-alt">Afficher plus ({filtered.length - limit} restantes)</button>}
      </div>
    </div>
  );
}
