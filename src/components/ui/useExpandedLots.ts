"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Etat replie / deplie des lots d'une vue (planning, budget).
 * Tous les lots sont replies a l'ouverture ; les lots deplies par l'utilisateur sont
 * memorises dans localStorage (une cle par projet) et retrouves a la visite suivante.
 */
export function useExpandedLots(storageKey: string, lotIds: string[]) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(storageKey) ?? "null"); setExpanded(new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])); } catch { setExpanded(new Set()); }
  }, [storageKey]);
  const update = useCallback((fn: (s: Set<string>) => Set<string>) => setExpanded((s) => {
    const n = fn(s);
    try { localStorage.setItem(storageKey, JSON.stringify(Array.from(n))); } catch {}
    return n;
  }), [storageKey]);
  const collapsed = useMemo(() => new Set(lotIds.filter((id) => !expanded.has(id))), [lotIds, expanded]);
  const toggle = useCallback((id: string) => update((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }), [update]);
  /** Deplie (open = true) ou replie (open = false) tous les lots. */
  const setAll = useCallback((open: boolean) => update(() => new Set(open ? lotIds : [])), [update, lotIds]);
  return { collapsed, toggle, setAll };
}
