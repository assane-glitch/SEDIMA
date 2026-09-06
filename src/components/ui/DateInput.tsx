"use client";
import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";

function isoWeek(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `S${Math.ceil(((d.getTime() - y0.getTime()) / 86400000 + 1) / 7)}`;
}

/** Champ date qui affiche la semaine ISO a cote de la valeur. Meme usage qu'un <input type="date">. */
export function DateInput({ className = "input", value, defaultValue, onChange, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const [inner, setInner] = useState(String(defaultValue ?? ""));
  const current = value !== undefined ? String(value) : inner;
  const handle = (e: ChangeEvent<HTMLInputElement>) => { if (value === undefined) setInner(e.target.value); onChange?.(e); };
  return (
    <div className="flex items-center gap-2">
      <input type="date" className={className} value={value !== undefined ? value : undefined} defaultValue={value === undefined ? defaultValue : undefined} onChange={handle} {...rest} />
      <span className="w-8 shrink-0 text-[10.5px] font-bold tabular-nums text-ink-muted" title="Semaine ISO">{isoWeek(current)}</span>
    </div>
  );
}
