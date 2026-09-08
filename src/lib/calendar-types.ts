/** Calendrier de travail (cote client) : jours ouvres, heures par jour, jours feries. */
export interface Holiday { id: string; day: string; label: string; recurring: boolean }
export interface WorkCalendar { workDays: number[]; hoursPerDay: number; holidays: Holiday[] }

export const DEFAULT_CALENDAR: WorkCalendar = { workDays: [1, 2, 3, 4, 5], hoursPerDay: 8, holidays: [] };
/** Libelles des jours ISO 1 (lundi) a 7 (dimanche). */
export const WEEKDAYS: { value: number; label: string; short: string }[] = [
  { value: 1, label: "Lundi", short: "Lun" }, { value: 2, label: "Mardi", short: "Mar" }, { value: 3, label: "Mercredi", short: "Mer" },
  { value: 4, label: "Jeudi", short: "Jeu" }, { value: 5, label: "Vendredi", short: "Ven" }, { value: 6, label: "Samedi", short: "Sam" }, { value: 7, label: "Dimanche", short: "Dim" },
];

/** Jour ISO (1 = lundi ... 7 = dimanche) d'une date YYYY-MM-DD. */
export function isoWeekday(iso: string) { const d = new Date(iso + "T00:00:00Z").getUTCDay(); return d === 0 ? 7 : d; }

/** Index des jours feries : date complete pour les ponctuels, jour-mois pour les recurrents. */
export function holidayIndex(cal: WorkCalendar) {
  const fixed = new Map<string, string>(), yearly = new Map<string, string>();
  for (const h of cal.holidays) (h.recurring ? yearly : fixed).set(h.recurring ? h.day.slice(5) : h.day, h.label);
  return { fixed, yearly };
}
type HolidayIndex = ReturnType<typeof holidayIndex>;

/** Libelle du jour ferie tombant a cette date, sinon undefined. */
export function holidayOn(iso: string, idx: HolidayIndex) { return idx.fixed.get(iso) ?? idx.yearly.get(iso.slice(5)); }

/** Vrai si le jour est ouvre : jour de la semaine travaille et non ferie. */
export function isWorkingDay(iso: string, cal: WorkCalendar, idx: HolidayIndex = holidayIndex(cal)) {
  return cal.workDays.includes(isoWeekday(iso)) && holidayOn(iso, idx) === undefined;
}

/** Nombre de jours ouvres entre deux dates incluses (0 si b < a). */
export function workingDays(a: string, b: string, cal: WorkCalendar) {
  if (b < a) return 0;
  const idx = holidayIndex(cal);
  let n = 0;
  const d = new Date(a + "T00:00:00Z"), end = new Date(b + "T00:00:00Z");
  for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) if (isWorkingDay(d.toISOString().slice(0, 10), cal, idx)) n++;
  return n;
}
