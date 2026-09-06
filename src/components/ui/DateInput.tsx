"use client";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ---------- utilitaires de dates (tout en UTC pour eviter les decalages) ---------- */
const DAY = 86400000;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const DOW = ["lu", "ma", "me", "je", "ve", "sa", "di"];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fromIso = (iso: string) => (ISO_RE.test(iso) ? new Date(iso + "T00:00:00Z") : null);
const todayIso = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };

/** Numero de semaine ISO d'une date (semaine du jeudi). */
export function isoWeek(d: Date) {
  const t = new Date(d.getTime());
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / DAY + 1) / 7);
}
const weekLabel = (iso: string) => { const d = fromIso(iso); return d ? `S${isoWeek(d)}` : ""; };
const display = (iso: string) => { const d = fromIso(iso); return d ? `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}` : ""; };

/** jj/mm/aaaa (ou jj/mm/aa, jj-mm-aaaa, aaaa-mm-jj) -> ISO, sinon null. */
function parseTyped(text: string): string | null {
  const s = text.trim();
  if (!s) return "";
  if (ISO_RE.test(s)) return fromIso(s) && toIso(fromIso(s)!) === s ? s : null;
  const m = s.match(/^(\d{1,2})[\/.\-\s](\d{1,2})[\/.\-\s](\d{2}|\d{4})$/);
  if (!m) return null;
  const dd = +m[1], mm = +m[2], yy = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  const d = new Date(Date.UTC(yy, mm - 1, dd));
  return d.getUTCFullYear() === yy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd ? toIso(d) : null;
}

/** Grille du mois : 6 lignes de 7 jours, lundi en premier, avec le numero de semaine ISO de chaque ligne. */
function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(first.getTime() - offset * DAY);
  return Array.from({ length: 6 }, (_, r) => {
    const days = Array.from({ length: 7 }, (_, c) => new Date(start.getTime() + (r * 7 + c) * DAY));
    return { week: isoWeek(days[3]), days };
  });
}

/* ---------- composant ---------- */
type ChangeLike = { target: { value: string; name?: string } };
export type DateInputProps = {
  name?: string; id?: string; className?: string;
  value?: string; defaultValue?: string | null;
  onChange?: (e: ChangeLike) => void;
  required?: boolean; disabled?: boolean; min?: string; max?: string;
  placeholder?: string;
};

/**
 * Champ date avec calendrier maison : semaines ISO affichees dans le calendrier et a cote de la valeur.
 * Meme contrat qu'un <input type="date"> (name, value/defaultValue, onChange -> e.target.value en ISO).
 */
export function DateInput({ name, id, className = "input", value, defaultValue, onChange, required, disabled, min, max, placeholder = "jj/mm/aaaa" }: DateInputProps) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const iso = controlled ? value : inner;
  const [text, setText] = useState(display(iso));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => { const d = fromIso(iso) ?? fromIso(todayIso())!; return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const inputId = id ?? `date-${autoId}`;

  // Valeur controlee modifiee de l'exterieur -> on rafraichit le texte.
  useEffect(() => { setText(display(iso)); }, [iso]);

  const commit = (next: string) => {
    if (!controlled) setInner(next);
    setText(display(next));
    onChange?.({ target: { value: next, name } });
  };
  const inRange = (d: string) => (!min || d >= min) && (!max || d <= max);

  const place = useCallback(() => {
    const r = anchor.current?.getBoundingClientRect(); if (!r) return;
    const h = 318, w = 276;
    const top = r.bottom + h + 8 > window.innerHeight && r.top - h - 4 > 0 ? r.top - h - 4 : r.bottom + 4;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    setPos({ top, left });
  }, []);
  const show = () => {
    if (disabled) return;
    const d = fromIso(iso) ?? fromIso(todayIso())!;
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    place(); setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchor.current?.contains(t) || pop.current?.contains(t)) return;
      setOpen(false);
    };
    // Echap ne ferme que le calendrier (pas le tiroir qui ecoute sur window) : capture + stopPropagation.
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  const onBlurText = () => {
    const parsed = parseTyped(text);
    if (parsed === null) { setText(display(iso)); return; }
    if (parsed !== iso) commit(parsed);
  };

  const today = todayIso();
  const rows = monthGrid(view.y, view.m);
  const shift = (months: number) => setView((v) => { const d = new Date(Date.UTC(v.y, v.m + months, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });

  return (
    <div ref={anchor} className="flex items-center gap-2">
      <input type="hidden" name={name} value={iso} />
      <div className="relative w-full">
        <input
          id={inputId} type="text" inputMode="numeric" autoComplete="off"
          className={`${className} pr-7`} value={text} placeholder={placeholder}
          required={required} disabled={disabled}
          onChange={(e) => setText(e.target.value)} onBlur={onBlurText} onFocus={show} onClick={show}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onBlurText(); setOpen(false); } }}
        />
        <button type="button" tabIndex={-1} disabled={disabled} onClick={() => (open ? setOpen(false) : show())}
          className="absolute inset-y-0 right-0 flex w-7 cursor-pointer items-center justify-center text-ink-faint hover:text-ink disabled:cursor-default"
          aria-label="Ouvrir le calendrier">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
      </div>
      <span className="w-8 shrink-0 text-[10.5px] font-bold tabular-nums text-ink-muted" title="Semaine ISO">{weekLabel(iso)}</span>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div ref={pop} role="dialog" aria-label="Calendrier" style={{ top: pos.top, left: pos.left, width: 276 }}
          className="fixed z-[60] rounded-lg border border-line bg-surface p-2.5 text-[11.5px] text-ink shadow-none"
          onMouseDown={(e) => e.preventDefault()}>
          {/* en-tete : mois + navigation */}
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <div className="flex items-center gap-0.5">
              <NavBtn onClick={() => shift(-12)} label="Annee precedente">«</NavBtn>
              <NavBtn onClick={() => shift(-1)} label="Mois precedent">‹</NavBtn>
            </div>
            <div className="text-[12px] font-bold capitalize">{MONTHS[view.m]} {view.y}</div>
            <div className="flex items-center gap-0.5">
              <NavBtn onClick={() => shift(1)} label="Mois suivant">›</NavBtn>
              <NavBtn onClick={() => shift(12)} label="Annee suivante">»</NavBtn>
            </div>
          </div>
          {/* grille : colonne semaine + 7 jours */}
          <div className="grid grid-cols-[30px_repeat(7,1fr)] gap-y-0.5">
            <div className="eyebrow pb-1 text-center">S</div>
            {DOW.map((d) => <div key={d} className="eyebrow pb-1 text-center">{d}</div>)}
            {rows.map(({ week, days }) => (
              <RowFragment key={week + "-" + toIso(days[0])} week={week} days={days} view={view} iso={iso} today={today} inRange={inRange}
                onPick={(d) => { commit(d); setOpen(false); }} />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button type="button" className="btn-ghost" onClick={() => { commit(""); setOpen(false); }}>Effacer</button>
            <button type="button" className="btn-ghost" onClick={() => { const d = fromIso(today)!; setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() }); if (inRange(today)) { commit(today); setOpen(false); } }}>Aujourd&apos;hui</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function NavBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick}
      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[13px] leading-none text-ink-muted hover:bg-surface-mut hover:text-ink">
      {children}
    </button>
  );
}

function RowFragment({ week, days, view, iso, today, inRange, onPick }: {
  week: number; days: Date[]; view: { y: number; m: number }; iso: string; today: string;
  inRange: (d: string) => boolean; onPick: (d: string) => void;
}) {
  const selectedRow = days.some((d) => toIso(d) === iso);
  return (
    <>
      <div className={`flex items-center justify-center text-[10px] font-bold tabular-nums ${selectedRow ? "text-ink" : "text-ink-faint"}`} title={`Semaine ${week}`}>{week}</div>
      {days.map((d) => {
        const k = toIso(d);
        const other = d.getUTCMonth() !== view.m;
        const sel = k === iso, isToday = k === today, ok = inRange(k);
        const cls = sel ? "bg-ink text-white font-bold"
          : !ok ? "text-line-lock cursor-default"
          : other ? "text-ink-faint hover:bg-surface-mut"
          : "text-ink hover:bg-surface-mut";
        return (
          <button key={k} type="button" disabled={!ok} onClick={() => onPick(k)}
            className={`relative mx-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-md tabular-nums ${cls}`}>
            {d.getUTCDate()}
            {isToday && !sel && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand" />}
          </button>
        );
      })}
    </>
  );
}
