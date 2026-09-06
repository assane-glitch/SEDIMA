/* eslint-disable @next/next/no-img-element -- URL signees Supabase, hors optimiseur Next */
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { deleteDocument, updateDocument } from "@/app/(app)/documents/actions";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { RefItem } from "@/lib/reference-types";
import type { Document } from "@/lib/types";
import type { DocProject, DocTask } from "./DocumentUpload";

export interface DocItem extends Document { url: string | null; author: string; projectCode: string; projectName: string; taskLabel: string }
const PERIODS = [{ v: 0, l: "Toutes dates" }, { v: 7, l: "7 jours" }, { v: 30, l: "30 jours" }, { v: 90, l: "90 jours" }];
const isImg = (d: Document) => d.mime_type.startsWith("image/");
const size = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);
const icon = (d: Document) => (d.mime_type.includes("pdf") ? "PDF" : d.mime_type.includes("sheet") || d.mime_type.includes("excel") || d.name.match(/\.xlsx?$/i) ? "XLS" : d.mime_type.includes("word") || d.name.match(/\.docx?$/i) ? "DOC" : d.name.match(/\.dwg$/i) ? "DWG" : "FIC");

/** Liste des documents : filtres, vue galerie ou tableau, visionneuse pour les photos, renommage et suppression. */
export function DocumentList({ docs, projects, tasks, docTypes, canEdit, meId, mode }: { docs: DocItem[]; projects: DocProject[]; tasks: DocTask[]; docTypes: RefItem[]; canEdit: boolean; meId: string; mode: "global" | "project" }) {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [q, setQ] = useState(""); const [project, setProject] = useState(""); const [type, setType] = useState(""); const [task, setTask] = useState(""); const [author, setAuthor] = useState(""); const [days, setDays] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const label = (v: string) => docTypes.find((d) => d.value === v)?.label ?? v;
  const authors = useMemo(() => Array.from(new Map(docs.filter((d) => d.uploaded_by).map((d) => [d.uploaded_by!, d.author])).entries()).sort((a, b) => a[1].localeCompare(b[1], "fr")), [docs]);
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : "";
  const filtered = useMemo(() => { const n = q.trim().toLowerCase(); return docs.filter((d) => (!project || d.project_id === project) && (!type || d.doc_type === type) && (!task || d.task_id === task) && (!author || d.uploaded_by === author) && (!since || d.created_at >= since) && (!n || `${d.name} ${d.projectCode} ${d.projectName} ${d.taskLabel} ${d.author} ${d.tags.join(" ")}`.toLowerCase().includes(n))); }, [docs, project, type, task, author, since, q]);
  const taskOptions = useMemo(() => tasks.filter((t) => (!project || t.project_id === project) && docs.some((d) => d.task_id === t.id)), [tasks, project, docs]);
  const images = filtered.filter((d) => isImg(d) && d.url);
  const cur = open !== null ? filtered[open] : null;
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); if (e.key === "ArrowRight") setOpen((o) => (o === null ? null : Math.min(filtered.length - 1, o + 1))); if (e.key === "ArrowLeft") setOpen((o) => (o === null ? null : Math.max(0, o - 1))); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered.length]);

  const remove = async (d: DocItem) => { if (!confirm(`Supprimer « ${d.name} » ? Cette action est definitive.`)) return; const r = await deleteDocument(d.id); if (r?.error) alert(r.error); else { setOpen(null); router.refresh(); } };
  const rename = async (d: DocItem) => { const name = prompt("Nouveau nom du document", d.name); if (!name || name === d.name) return; const r = await updateDocument(d.id, { name }); if (r?.error) alert(r.error); else router.refresh(); };
  const retype = async (d: DocItem, doc_type: string) => { const r = await updateDocument(d.id, { doc_type }); if (r?.error) alert(r.error); else router.refresh(); };
  const mayEdit = (d: DocItem) => canEdit || d.uploaded_by === meId;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un document…" className="input !w-56" />
        {mode === "global" && <select value={project} onChange={(e) => { setProject(e.target.value); setTask(""); }} className="input !w-52"><option value="">Tous les projets</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select>}
        {taskOptions.length > 0 && <select value={task} onChange={(e) => setTask(e.target.value)} className="input !w-52"><option value="">Toutes les taches</option>{taskOptions.map((t) => <option key={t.id} value={t.id}>{t.wbs_code ? `${t.wbs_code} · ` : ""}{t.name}</option>)}</select>}
        {authors.length > 1 && <select value={author} onChange={(e) => setAuthor(e.target.value)} className="input !w-44"><option value="">Tous les auteurs</option>{authors.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>}
        <span className="ml-auto text-[10px] text-ink-muted">{filtered.length} / {docs.length} document{docs.length > 1 ? "s" : ""}</span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button onClick={() => setType("")} className={`filter-chip ${!type ? "filter-chip-active" : ""}`}>Tous types</button>
        {docTypes.map((d) => { const n = docs.filter((x) => x.doc_type === d.value).length; return n ? <button key={d.value} onClick={() => setType(d.value)} className={`filter-chip ${type === d.value ? "filter-chip-active" : ""}`}>{d.label} <span className="opacity-60">{n}</span></button> : null; })}
        <span className="mx-1 h-4 w-px bg-line-hair" />
        {PERIODS.map((p) => <button key={p.v} onClick={() => setDays(p.v)} className={`filter-chip ${days === p.v ? "filter-chip-active" : ""}`}>{p.l}</button>)}
        <span className="ml-auto inline-flex overflow-hidden rounded-md border border-line">
          <button onClick={() => setView("grid")} className={`px-2.5 py-[3px] text-[10px] font-semibold ${view === "grid" ? "bg-ink text-surface" : "bg-surface text-ink-body hover:bg-surface-sub"}`}>▦ Galerie</button>
          <button onClick={() => setView("list")} className={`px-2.5 py-[3px] text-[10px] font-semibold ${view === "list" ? "bg-ink text-surface" : "bg-surface text-ink-body hover:bg-surface-sub"}`}>☰ Liste</button>
        </span>
      </div>

      {filtered.length === 0 ? <div className="card px-4 py-10 text-center text-[10.5px] text-ink-faint">Aucun document.</div> : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((d, i) => (
            <button key={d.id} onClick={() => setOpen(i)} className="card group cursor-pointer overflow-hidden text-left hover:border-line">
              <div className="flex aspect-[4/3] items-center justify-center bg-surface-sub">
                {isImg(d) && d.url ? <img src={d.url} alt={d.name} loading="lazy" className="h-full w-full object-cover" /> : <span className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-bold text-ink-muted">{icon(d)}</span>}
              </div>
              <div className="px-2.5 py-2">
                <div className="truncate text-[10.5px] font-semibold text-ink" title={d.name}>{d.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-ink-muted"><span className="font-semibold">{d.projectCode}</span><span>·</span><span>{formatDate(d.created_at.slice(0, 10))}</span><span className="ml-auto">{label(d.doc_type)}</span></div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto"><table className="tbl"><thead><tr><th className="w-10" /><th>Nom</th>{mode === "global" && <th>Projet</th>}<th className="hidden md:table-cell">Tache</th><th>Type</th><th className="hidden md:table-cell">Auteur</th><th>Date</th><th className="num hidden lg:table-cell">Taille</th><th /></tr></thead><tbody>
          {filtered.map((d, i) => (
            <tr key={d.id} className="cursor-pointer" onClick={() => setOpen(i)}>
              <td>{isImg(d) && d.url ? <img src={d.url} alt="" className="h-7 w-9 rounded object-cover" loading="lazy" /> : <span className="text-[9px] font-bold text-ink-muted">{icon(d)}</span>}</td>
              <td className="max-w-[360px] truncate font-semibold text-ink">{d.name}</td>
              {mode === "global" && <td className="whitespace-nowrap"><Link href={`/projects/${d.project_id}/documents`} onClick={(e) => e.stopPropagation()} className="font-semibold hover:underline" title={d.projectName}>{d.projectCode}</Link></td>}
              <td className="hidden max-w-[220px] truncate text-ink-muted md:table-cell">{d.taskLabel || "—"}</td>
              <td><Badge tone={d.doc_type === "photo" ? "info" : "neutral"}>{label(d.doc_type)}</Badge></td>
              <td className="hidden text-ink-muted md:table-cell">{d.author}</td>
              <td className="whitespace-nowrap tabular-nums">{formatDate(d.created_at.slice(0, 10))}</td>
              <td className="num hidden text-ink-muted lg:table-cell">{size(d.size_bytes)}</td>
              <td className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>{d.url && <a href={d.url} target="_blank" rel="noreferrer" className="btn-ghost">Ouvrir</a>}</td>
            </tr>
          ))}
        </tbody></table></div>
      )}

      {cur && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink/90 text-surface" onClick={() => setOpen(null)}>
          <div className="flex items-center gap-3 px-4 py-2.5 text-[11px]" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0 flex-1 truncate font-semibold">{cur.name}</div>
            <div className="hidden text-surface/70 sm:block">{cur.projectCode} · {label(cur.doc_type)} · {cur.taskLabel || "Projet entier"} · {cur.author} · {formatDate(cur.created_at.slice(0, 10))} · {size(cur.size_bytes)}</div>
            {cur.url && <a href={cur.url} target="_blank" rel="noreferrer" className="rounded-md border border-surface/30 px-2 py-0.5 hover:bg-surface/10">Ouvrir</a>}
            {mayEdit(cur) && <button onClick={() => rename(cur)} className="rounded-md border border-surface/30 px-2 py-0.5 hover:bg-surface/10">Renommer</button>}
            {mayEdit(cur) && <select value={cur.doc_type} onChange={(e) => retype(cur, e.target.value)} className="rounded-md border border-surface/30 bg-transparent px-1.5 py-0.5 text-surface [&_option]:text-ink">{docTypes.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select>}
            {canEdit && <button onClick={() => remove(cur)} className="rounded-md border border-brand px-2 py-0.5 text-brand hover:bg-brand/20">Supprimer</button>}
            <button onClick={() => setOpen(null)} className="ml-2 text-[16px] leading-none" aria-label="Fermer">×</button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
            {open! > 0 && <button onClick={(e) => { e.stopPropagation(); setOpen(open! - 1); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/10 px-3 py-1.5 text-[18px] hover:bg-surface/20" aria-label="Precedent">‹</button>}
            {isImg(cur) && cur.url ? <img src={cur.url} alt={cur.name} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
              : cur.url && cur.mime_type.includes("pdf") ? <iframe src={cur.url} title={cur.name} className="h-full w-full max-w-5xl rounded-md bg-surface" onClick={(e) => e.stopPropagation()} />
              : <div className="rounded-lg bg-surface/10 px-6 py-8 text-center" onClick={(e) => e.stopPropagation()}><div className="text-[24px] font-bold">{icon(cur)}</div><div className="mt-2 text-[11px] text-surface/80">Apercu indisponible pour ce format.</div>{cur.url && <a href={cur.url} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-md border border-surface/40 px-3 py-1 text-[11px]">Telecharger</a>}</div>}
            {open! < filtered.length - 1 && <button onClick={(e) => { e.stopPropagation(); setOpen(open! + 1); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/10 px-3 py-1.5 text-[18px] hover:bg-surface/20" aria-label="Suivant">›</button>}
          </div>
          {images.length > 0 && <div className="px-4 pb-2 text-center text-[10px] text-surface/60">{open! + 1} / {filtered.length} · flèches du clavier pour naviguer, Echap pour fermer</div>}
        </div>
      )}
    </div>
  );
}
