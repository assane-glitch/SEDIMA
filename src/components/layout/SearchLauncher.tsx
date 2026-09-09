"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

/** Bouton loupe de la barre superieure : ouvre un panneau de recherche (aussi par Ctrl+K ou « / ») qui mene a /search. */
export function SearchLauncher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null; const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) { setQ(""); setTimeout(() => ref.current?.focus(), 0); } }, [open]);
  const submit = (e: React.FormEvent) => { e.preventDefault(); const v = q.trim(); if (!v) return; setOpen(false); router.push(`/search?q=${encodeURIComponent(v)}`); };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Rechercher (Ctrl K)" title="Rechercher · Ctrl K" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-surface-sub hover:text-ink">
        <Icon name="search" className="h-[17px] w-[17px]" strokeWidth={1.9} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-4 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <form role="search" onSubmit={submit} className="w-full max-w-xl rounded-xl border border-line-hair bg-surface p-2">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un projet, une tache, une depense, un document…" aria-label="Recherche" className="input !border-transparent !bg-surface-sub !py-[9px] !pl-9 !pr-20 !text-[12.5px] focus:!bg-surface" />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-surface px-1.5 text-[9px] font-semibold text-ink-faint">Echap</kbd>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-ink-faint"><span>Entree pour lancer la recherche</span><span>Ctrl K ou / pour ouvrir</span></div>
          </form>
        </div>
      )}
    </>
  );
}
