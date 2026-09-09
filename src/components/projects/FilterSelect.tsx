"use client";
import { useRouter } from "next/navigation";

/** Liste deroulante de filtre : chaque option porte l'URL a ouvrir, la navigation se fait au changement. */
export function FilterSelect({ label, value, options, className = "" }: { label: string; value: string; options: { value: string; label: string; href: string }[]; className?: string }) {
  const router = useRouter();
  return (
    <select aria-label={label} value={value} onChange={(e) => { const o = options.find((x) => x.value === e.target.value); if (o) router.push(o.href); }}
      className={`input !w-auto !py-[5px] !pr-7 text-[10.5px] font-semibold ${value ? "!border-ink-muted text-ink" : "text-ink-body"} ${className}`}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
