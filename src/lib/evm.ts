/**
 * Gestion de la valeur acquise (PMBOK 6, chapitre Couts et Echeancier) a partir des donnees SEDIMA :
 * budgets et dates de reference des taches feuilles (PV), avancement (EV), depenses datees (AC).
 * Fonctions pures, utilisables cote client comme cote serveur.
 */
import { addDays, daysBetween, mondayOf } from "@/lib/format";
import type { Task } from "@/lib/types";

export interface EvmExpense { amount: number; spent_on: string; status: string }
/** Changement d'avancement d'une tache, date au jour (issu du journal d'audit). */
export interface ProgressEvent { taskId: string; at: string; progress: number }
export interface EvmPoint { date: string; pv: number; ev: number | null; ac: number | null }
export type IndexStatus = "ok" | "warn" | "alert" | "idle";

export interface EvmResult {
  bac: number;            // budget a l'achevement = somme des budgets des taches feuilles (reference de mesure)
  envelope: number;       // enveloppe approuvee du projet
  pv: number; ev: number; ac: number;
  sv: number; cv: number;
  spi: number | null; cpi: number | null;
  eac: number; etc: number; vac: number; tcpi: number | null;
  plannedPct: number; actualPct: number;
  plannedStart: string; plannedEnd: string;
  earnedSchedule: string | null;   // date a laquelle la valeur acquise actuelle etait prevue
  delayDays: number;               // retard en jours (positif = en retard)
  spiTime: number | null;
  forecastEnd: string;
  forecastCapped: boolean;         // projection plafonnee (SPI tres faible) : la vraie date est au-dela
  baselineFrozen: boolean;
  series: EvmPoint[];
  historySince: string | null;     // premiere date d'historique d'avancement disponible
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Part planifiee d'une tache realisee a la date t (jours inclus, lissage lineaire). */
function frac(t: string, start: string, end: string) {
  const dur = Math.max(1, daysBetween(start, end) + 1);
  return clamp(daysBetween(start, t) + 1, 0, dur) / dur;
}
export const indexStatus = (v: number | null): IndexStatus => (v === null ? "idle" : v >= 0.95 ? "ok" : v >= 0.85 ? "warn" : "alert");

export function computeEvm(leaves: Task[], expenses: EvmExpense[], excludedStatuses: Set<string>, events: ProgressEvent[], envelope: number, projectStart: string, projectEnd: string, today: string): EvmResult {
  const items = leaves.map((t) => ({ id: t.id, budget: Number(t.budget) || 0, bs: t.baseline_start ?? t.start_date, be: t.baseline_end ?? t.baseline_start ?? t.end_date, progress: clamp(Number(t.progress) || 0, 0, 100) }));
  const baselineFrozen = leaves.some((t) => !!t.baseline_start);
  const bacTasks = items.reduce((s, i) => s + i.budget, 0);
  const bac = bacTasks > 0 ? bacTasks : envelope;
  const plannedStart = items.reduce((m, i) => (i.bs < m ? i.bs : m), projectStart);
  const plannedEnd = items.reduce((m, i) => (i.be > m ? i.be : m), projectEnd);
  const valid = expenses.filter((e) => !excludedStatuses.has(e.status)).map((e) => ({ d: e.spent_on, a: Number(e.amount) || 0 })).sort((a, b) => a.d.localeCompare(b.d));
  const byTask = new Map<string, ProgressEvent[]>();
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) byTask.set(e.taskId, [...(byTask.get(e.taskId) ?? []), e]);
  const historySince = events.length ? events.reduce((m, e) => (e.at < m ? e.at : m), events[0].at) : null;

  const pvAt = (d: string) => items.reduce((s, i) => s + i.budget * frac(d, i.bs, i.be), 0);
  const acAt = (d: string) => { let s = 0; for (const e of valid) { if (e.d > d) break; s += e.a; } return s; };
  const progressAt = (i: typeof items[number], d: string) => {
    if (d >= today) return i.progress;
    const ev = byTask.get(i.id); if (!ev) return i.progress;
    let p: number | null = null; for (const e of ev) { if (e.at <= d) p = e.progress; else break; }
    return p ?? (historySince && d < historySince ? 0 : i.progress);
  };
  const evAt = (d: string) => items.reduce((s, i) => s + i.budget * progressAt(i, d) / 100, 0);

  const pv = pvAt(today), ev = evAt(today), ac = acAt(today);
  const spi = pv > 0 ? ev / pv : null, cpi = ac > 0 ? ev / ac : null;
  const eac = cpi && cpi > 0 ? ac + (bac - ev) / cpi : ac + (bac - ev);
  const tcpi = bac - ac > 0 ? (bac - ev) / (bac - ac) : null;

  // Echeancier acquis : premiere date a laquelle la PV atteint l'EV actuelle
  let earnedSchedule: string | null = null;
  if (ev > 0 && bac > 0) {
    if (ev >= pvAt(plannedEnd) - 1e-6) earnedSchedule = plannedEnd;
    else { let lo = plannedStart, hi = plannedEnd; while (daysBetween(lo, hi) > 1) { const mid = addDays(lo, Math.floor(daysBetween(lo, hi) / 2)); if (pvAt(mid) >= ev) hi = mid; else lo = mid; } earnedSchedule = pvAt(lo) >= ev ? lo : hi; }
  }
  const at = Math.max(0, daysBetween(plannedStart, today > plannedEnd ? plannedEnd : today));
  const es = earnedSchedule ? Math.max(0, daysBetween(plannedStart, earnedSchedule)) : 0;
  const started = today >= plannedStart && pv > 0;
  const spiTime = started && at > 0 ? es / at : null;
  const delayDays = started ? at - es : 0;
  const plannedDuration = Math.max(1, daysBetween(plannedStart, plannedEnd));
  const rawForecast = spiTime && spiTime > 0 && ev < bac ? addDays(plannedStart, Math.round(plannedDuration / spiTime)) : (ev >= bac && bac > 0 ? today : plannedEnd);
  const maxForecast = addDays(plannedEnd, plannedDuration);   // au plus le double de la duree de reference
  const forecastCapped = rawForecast > maxForecast;
  const forecastEnd = forecastCapped ? maxForecast : rawForecast;

  // Serie hebdomadaire : PV sur toute la duree, EV et AC jusqu'a aujourd'hui
  const series: EvmPoint[] = [];
  const first = mondayOf(plannedStart), last = [plannedEnd, forecastEnd, today].reduce((m, d) => (d > m ? d : m));
  for (let d = first, n = 0; d <= last && n < 400; d = addDays(d, 7), n++) {
    const past = d <= today;
    series.push({ date: d, pv: Math.round(pvAt(d)), ev: past ? Math.round(evAt(d)) : null, ac: past ? Math.round(acAt(d)) : null });
  }
  if (!series.some((p) => p.date === today)) { series.push({ date: today, pv: Math.round(pv), ev: Math.round(ev), ac: Math.round(ac) }); series.sort((a, b) => a.date.localeCompare(b.date)); }

  return {
    bac, envelope, pv, ev, ac, sv: ev - pv, cv: ev - ac, spi, cpi, eac, etc: Math.max(0, eac - ac), vac: bac - eac, tcpi,
    plannedPct: bac > 0 ? (pv / bac) * 100 : 0, actualPct: bac > 0 ? (ev / bac) * 100 : 0,
    plannedStart, plannedEnd, earnedSchedule, delayDays, spiTime, forecastEnd, forecastCapped, baselineFrozen, series, historySince,
  };
}

/** Chemin critique : chaine de taches liees (non terminees) de plus longue duree cumulee. */
export function criticalPath(leaves: Task[]) {
  const open = leaves.filter((t) => t.status !== "done");
  const ids = new Set(open.map((t) => t.id));
  const succ = new Map<string, Task[]>();
  for (const t of open) if (t.depends_on && ids.has(t.depends_on)) succ.set(t.depends_on, [...(succ.get(t.depends_on) ?? []), t]);
  if (succ.size === 0) return { chain: [] as Task[], days: 0 };
  const dur = (t: Task) => Math.max(1, daysBetween(t.start_date, t.end_date) + 1);
  const memo = new Map<string, { len: number; next: Task | null }>();
  const longest = (t: Task, depth = 0): { len: number; next: Task | null } => {
    const m = memo.get(t.id); if (m) return m;
    let best: { len: number; next: Task | null } = { len: 0, next: null };
    if (depth < 500) for (const s of succ.get(t.id) ?? []) { const r = longest(s, depth + 1); if (r.len > best.len) best = { len: r.len, next: s }; }
    const out = { len: dur(t) + best.len, next: best.next }; memo.set(t.id, out); return out;
  };
  const hasPred = new Set(open.filter((t) => t.depends_on && ids.has(t.depends_on)).map((t) => t.id));
  let start: Task | null = null, max = 0;
  for (const t of open) if (!hasPred.has(t.id) && succ.has(t.id)) { const r = longest(t); if (r.len > max) { max = r.len; start = t; } }
  const chain: Task[] = [];
  for (let cur: Task | null = start; cur && chain.length < 200; cur = longest(cur).next) chain.push(cur);
  return { chain, days: max };
}

/** Derive des taches par rapport a la reference : nombre en ecart, ecart moyen et maximal en jours (fin). */
export function baselineDrift(leaves: Task[]) {
  const withRef = leaves.filter((t) => t.baseline_end);
  const shifts = withRef.map((t) => daysBetween(t.baseline_end!, t.end_date)).filter((d) => d !== 0);
  const late = shifts.filter((d) => d > 0);
  return { withRef: withRef.length, drifting: shifts.length, meanLate: late.length ? Math.round(late.reduce((a, b) => a + b, 0) / late.length) : 0, max: shifts.length ? Math.max(...shifts) : 0 };
}

export function fmtIndex(v: number | null) { return v === null ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
