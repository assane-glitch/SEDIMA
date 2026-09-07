"use client";
import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { weekLabel } from "@/lib/format";

/** Champ date qui affiche la semaine ISO a cote de la valeur. Meme usage qu'un <input type="date">. */
export function DateInput({ className = "input", value, defaultValue, onChange, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const [inner, setInner] = useState(String(defaultValue ?? ""));
  const current = value !== undefined ? String(value) : inner;
  const handle = (e: ChangeEvent<HTMLInputElement>) => { if (value === undefined) setInner(e.target.value); onChange?.(e); };
  return (
    <div className="flex items-center gap-2">
      <input type="date" className={className} value={value !== undefined ? value : undefined} defaultValue={value === undefined ? defaultValue : undefined} onChange={handle} {...rest} />
      <span className="w-8 shrink-0 text-[10.5px] font-bold tabular-nums text-ink-muted" title="Semaine ISO">{weekLabel(current)}</span>
    </div>
  );
}
