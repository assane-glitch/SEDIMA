"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteProject } from "@/app/(app)/projects/actions";
import { Icon } from "@/components/icons";

/**
 * Menu « ⋮ » d'une carte projet : acces rapide aux onglets et, pour les editeurs,
 * suppression du projet apres recopie de son code.
 */
export function ProjectCardMenu({ projectId, code, name, canEdit }: { projectId: string; code: string; name: string; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const close = () => { setOpen(false); setConfirming(false); setTyped(""); setErr(null); };
  const unlocked = typed.trim().toUpperCase() === code.toUpperCase();
  const remove = () => {
    if (!unlocked || !confirm(`Supprimer definitivement le projet ${code} « ${name} » et toutes ses donnees ? Cette action est irreversible.`)) return;
    start(async () => {
      setErr(null);
      const fd = new FormData(); fd.set("id", projectId);
      try {
        const r = await deleteProject(fd);
        if (r && "error" in r && r.error) { setErr(r.error); return; }
      } catch (e) { setErr(e instanceof Error ? e.message : "Suppression impossible"); return; }
      close();
      router.refresh();
    });
  };
  const item = "block rounded-md px-2.5 py-1.5 text-[10.5px] text-ink-body hover:bg-surface-sub";
  return (
    <div ref={ref} className="relative" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <button type="button" aria-label="Actions du projet" aria-expanded={open} title="Actions" onClick={() => (open ? close() : setOpen(true))}
        className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-sub hover:text-ink ${open ? "bg-surface-sub text-ink" : ""}`}>
        <Icon name="more" className="h-4 w-4" strokeWidth={2.2} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-30 w-56 rounded-lg border border-line-hair bg-surface p-1.5">
          {!confirming ? (
            <>
              <Link href={`/projects/${projectId}`} className={item}>Apercu</Link>
              <Link href={`/projects/${projectId}/planning`} className={item}>Planning</Link>
              <Link href={`/projects/${projectId}/budget`} className={item}>Budget</Link>
              {canEdit && <Link href={`/projects/${projectId}/settings`} className={item}>Parametres</Link>}
              {canEdit && <>
                <div className="my-1 border-t border-line-hair" />
                <button type="button" onClick={() => setConfirming(true)} className={`${item} w-full text-left text-alert hover:bg-alert-bg`}>Supprimer le projet…</button>
              </>}
            </>
          ) : (
            <div className="space-y-2 p-1">
              <div className="text-[10.5px] font-semibold text-alert">Supprimer {code} et toutes ses donnees ?</div>
              <p className="text-[10px] text-ink-muted">Taches, jalons, depenses, journal, registres, documents et demandes de changement seront supprimes. Action irreversible.</p>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`Recopier ${code}`} autoFocus autoComplete="off" className="input !py-1 font-mono" onKeyDown={(e) => { if (e.key === "Enter") remove(); }} />
              {err && <div className="text-[10px] font-semibold text-alert">{err}</div>}
              <div className="flex justify-end gap-1.5">
                <button type="button" onClick={close} className="btn-secondary !py-1">Annuler</button>
                <button type="button" onClick={remove} disabled={!unlocked || pending} className="btn-danger !py-1">{pending ? "Suppression…" : "Supprimer"}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
