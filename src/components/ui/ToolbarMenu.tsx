"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

export interface ToolbarMenuItem { label: string; hint?: string; checked?: boolean; onSelect: () => void; keepOpen?: boolean }

/** Menu deroulant d'une barre d'outils : bouton (secondaire ou primaire) et liste d'actions, avec case a cocher pour les bascules. */
export function ToolbarMenu({ label, items, primary = false, align = "right", className = "" }: { label: string; items: ToolbarMenuItem[]; primary?: boolean; align?: "left" | "right"; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  if (items.length === 0) return null;
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`${primary ? "btn-primary" : "btn-secondary"} !py-[2px] ${open && !primary ? "!bg-surface-sub" : ""}`}>
        {label}<Icon name="chevronDown" className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.4} />
      </button>
      {open && (
        <div role="menu" className={`absolute top-full z-40 w-60 pt-1 ${align === "right" ? "right-0" : "left-0"}`}>
          <div className="rounded-lg border border-line-hair bg-surface p-1.5">
            {items.map((i) => (
              <button key={i.label} type="button" role={i.checked === undefined ? "menuitem" : "menuitemcheckbox"} aria-checked={i.checked} onClick={() => { i.onSelect(); if (!i.keepOpen) setOpen(false); }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[11px] text-ink-body hover:bg-surface-sub">
                {i.checked !== undefined && <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${i.checked ? "border-ink bg-ink text-surface" : "border-line bg-surface"}`}>{i.checked && <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} />}</span>}
                <span className="min-w-0 flex-1"><span className="block">{i.label}</span>{i.hint && <span className="block truncate text-[9.5px] text-ink-faint">{i.hint}</span>}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
