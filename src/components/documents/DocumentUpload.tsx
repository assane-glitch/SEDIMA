"use client";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { addDocument } from "@/app/(app)/documents/actions";
import { createClient } from "@/lib/supabase/client";
import type { RefItem } from "@/lib/reference-types";

export interface DocProject { id: string; code: string; name: string }
export interface DocTask { id: string; name: string; wbs_code: string | null; project_id: string }

const MAX_SIDE = 1600;
/** Reduit une photo cote navigateur (max 1600 px, JPEG 85 %) pour limiter le poids des envois terrain. */
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 400_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const ratio = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (ratio === 1) return file;
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * ratio); c.height = Math.round(bmp.height * ratio);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
  } catch { return file; }
}
const ext = (name: string, mime: string) => { const e = name.split(".").pop()?.toLowerCase(); return e && e.length <= 5 ? e : mime === "image/jpeg" ? "jpg" : "bin"; };

/** Depot de fichiers et photos : plusieurs fichiers a la fois, projet et tache, type de document. */
export function DocumentUpload({ projects, tasks, docTypes, projectId, taskId, mobile, compact, onDone }: {
  projects: DocProject[]; tasks: DocTask[]; docTypes: RefItem[]; projectId?: string; taskId?: string; mobile?: boolean; compact?: boolean; onDone?: () => void;
}) {
  const router = useRouter();
  const [pid, setPid] = useState(projectId ?? projects[0]?.id ?? "");
  const [tid, setTid] = useState(taskId ?? "");
  const [type, setType] = useState(docTypes[0]?.value ?? "autre");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const projTasks = useMemo(() => tasks.filter((t) => t.project_id === pid), [tasks, pid]);
  const big = mobile ? " !text-[16px] !py-2.5" : "";

  const pick = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles((f) => [...f, ...arr]);
    if (arr.length && arr.every((f) => f.type.startsWith("image/")) && docTypes.some((d) => d.value === "photo")) setType("photo");
  };

  const submit = async () => {
    if (!pid || files.length === 0) return;
    setBusy(true); setErr(null);
    const supabase = createClient();
    let done = 0;
    for (const f of files) {
      setProgress(`${done + 1} / ${files.length} · ${f.name}`);
      const blob = await shrinkImage(f);
      const mime = blob.type || f.type || "application/octet-stream";
      const path = `${pid}/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext(f.name, mime)}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, blob, { contentType: mime, upsert: false });
      if (upErr) { setErr(`Echec de l'envoi de ${f.name} : ${upErr.message}`); break; }
      const r = await addDocument({ project_id: pid, task_id: tid || null, name: f.name, doc_type: type, storage_path: path, mime_type: mime, size_bytes: blob.size, source: mobile ? "mobile" : "web", tags: [] });
      if (r?.error) { setErr(r.error); await supabase.storage.from("documents").remove([path]); break; }
      done++;
    }
    setBusy(false); setProgress("");
    if (done === files.length) { setFiles([]); onDone?.(); router.refresh(); }
    else setFiles((f) => f.slice(done));
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!projectId && (
        <div><label className="label">Projet</label>
          <select value={pid} onChange={(e) => { setPid(e.target.value); setTid(""); }} className={`input${big}`}>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></div>
      )}
      {!taskId && (
        <div><label className="label">Tache (facultatif)</label>
          <select value={tid} onChange={(e) => setTid(e.target.value)} className={`input${big}`}><option value="">— Projet entier —</option>{projTasks.map((t) => <option key={t.id} value={t.id}>{t.wbs_code ? `${t.wbs_code} · ` : ""}{t.name}</option>)}</select></div>
      )}
      <div><label className="label">Type de document</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className={`input${big}`}>{docTypes.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.dwg,.txt,.csv,.zip" />
      <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className={`btn-secondary ${mobile ? "flex-1 !py-3 !text-[13px]" : ""}`}>Choisir des fichiers</button>
        <button type="button" onClick={() => camRef.current?.click()} className={`btn-secondary ${mobile ? "flex-1 !py-3 !text-[13px]" : ""}`}>Prendre une photo</button>
      </div>
      {files.length > 0 && (
        <ul className="divide-y divide-line-light rounded-md border border-line-hair text-[10.5px]">
          {files.map((f, i) => <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 px-2.5 py-1.5"><span className="truncate">{f.name}</span><span className="flex shrink-0 items-center gap-2 text-ink-faint">{(f.size / 1024 / 1024).toFixed(1)} Mo<button type="button" onClick={() => setFiles((l) => l.filter((_, j) => j !== i))} className="btn-ghost">×</button></span></li>)}
        </ul>
      )}
      {err && <p className="rounded-md border border-alert-bd bg-alert-bg px-2.5 py-1.5 text-[10.5px] text-alert">{err}</p>}
      {progress && <p className="hint">Envoi {progress}</p>}
      <div className="flex justify-end">
        <button type="button" disabled={busy || files.length === 0 || !pid} onClick={submit} className={`btn-primary ${mobile ? "w-full !py-3 !text-[13px]" : ""}`}>{busy ? "Envoi…" : `Deposer ${files.length > 1 ? `${files.length} fichiers` : "le fichier"}`}</button>
      </div>
      <p className="hint">Photos reduites automatiquement a 1600 px. Taille maximale par fichier : 25 Mo.</p>
    </div>
  );
}
