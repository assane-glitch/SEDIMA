export function formatMoney(amount: number, currency = "XOF") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount || 0);
}

export function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Numero de semaine ISO d'une date ISO (aaaa-mm-jj). */
export function isoWeek(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - y0.getTime()) / 86_400_000 + 1) / 7);
}

/** Libelle de semaine : S12 ; avec l'annee ISO (S52/2027) si withYear, ou si elle differe de l'annee en cours en mode "auto". */
export function weekLabel(iso: string, mode: "short" | "auto" | "year" = "short") {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = d.getUTCFullYear();
  const n = isoWeek(iso);
  const showYear = mode === "year" || (mode === "auto" && y !== new Date().getFullYear());
  return `S${n}${showYear ? `/${y}` : ""}`;
}

/** Lundi de la semaine ISO contenant la date. */
export function mondayOf(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Montant en milliers : 87 870 k. */
export function kMoney(v: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v / 1000))} k`;
}

/** Montant court : 3,5 Md FCFA, 256 M FCFA, 120 k FCFA. */
export function shortMoney(v: number) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md FCFA`;
  if (a >= 1e6) return `${Math.round(v / 1e6).toLocaleString("fr-FR")} M FCFA`;
  return `${Math.round(v / 1e3).toLocaleString("fr-FR")} k FCFA`;
}
