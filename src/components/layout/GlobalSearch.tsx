"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

/** Recherche globale : formulaire vers /search, raccourci "/" ou Ctrl+K pour y acceder. */
export function GlobalSearch({ compact, dark }: { compact?: boolean; dark?: boolean }) {
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
      <Icon name="search" className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${dark ? "text-white/60" : "text-ink-faint"}`} />
      <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder={compact ? "Rechercher…" : "Rechercher un projet, une tache, une depense, un document…"} aria-label="Recherche"
        className={dark ? "input !rounded-full !border-transparent !bg-white/10 !py-[6px] !pl-9 !pr-14 !text-surface placeholder:!text-white/50 focus:!bg-white/15" : "input !rounded-full !bg-surface-sub !py-[7px] !pl-9 !pr-16 focus:!bg-surface"} />
      <kbd className={`pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border px-1.5 text-[9px] font-semibold md:block ${dark ? "border-white/20 bg-white/10 text-white/60" : "border-line bg-surface text-ink-faint"}`}>Ctrl K</kbd>
    </form>
  );
}
