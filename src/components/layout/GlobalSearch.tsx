"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

/** Recherche globale : formulaire vers /search, raccourci "/" ou Ctrl+K pour y acceder. */
export function GlobalSearch({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const ref = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => { setQ(params.get("q") ?? ""); }, [params]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null; const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); ref.current?.focus(); ref.current?.select(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); const v = q.trim(); if (v) router.push(`/search?q=${encodeURIComponent(v)}`); }} className={`relative w-full ${compact ? "" : "max-w-xl"}`}>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un projet, une tache, une depense, un document…" aria-label="Recherche"
        className="input !rounded-full !bg-surface-sub !py-[7px] !pl-9 !pr-16 focus:!bg-surface" />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 text-[9px] font-semibold text-ink-faint md:block">Ctrl K</kbd>
    </form>
  );
}
