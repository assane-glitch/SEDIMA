import { redirect } from "next/navigation";
import { Alert, Badge, PageHeader } from "@/components/ui";
import { DateInput } from "@/components/ui/DateInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { WEEKDAYS, getCalendar, isoWeekday } from "@/lib/calendar";
import { formatDate, today } from "@/lib/format";
import { requireProfile } from "@/lib/session";
import { addHoliday, deleteHoliday, saveCalendarSettings, updateHoliday } from "./actions";

export const metadata = { title: "Calendrier de travail" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/dashboard");
  const sp = await searchParams;
  const cal = await getCalendar();
  const t0 = today();
  const workLabel = WEEKDAYS.filter((w) => cal.workDays.includes(w.value)).map((w) => w.short).join(", ");

  return (
    <>
      <PageHeader crumbs={[{ href: "/admin", label: "Administration" }]} title="Calendrier de travail" subtitle="Jours ouvres de la semaine, heures par jour et jours feries. Le Gantt grise les jours chomes et le tiroir d'une tache affiche sa duree en jours ouvres." />
      {sp.ok && <div className="mb-3"><Alert tone="ok">{sp.ok}</Alert></div>}
      {sp.error && <div className="mb-3"><Alert>{sp.error}</Alert></div>}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <form action={saveCalendarSettings} className="card card-pad h-fit space-y-3">
          <div className="card-title">Semaine de travail</div>
          <p className="hint">Semaine actuelle : {workLabel} · {cal.hoursPerDay} h par jour.</p>
          <div>
            <label className="label">Jours ouvres</label>
            <div className="grid grid-cols-2 gap-1.5">
              {WEEKDAYS.map((w) => (
                <label key={w.value} className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-[10.5px]">
                  <input type="checkbox" name="work_day" value={w.value} defaultChecked={cal.workDays.includes(w.value)} />{w.label}
                </label>
              ))}
            </div>
          </div>
          <div><label className="label">Heures par jour ouvre</label><input name="hours_per_day" type="number" step="0.5" min="0.5" max="24" defaultValue={cal.hoursPerDay} className="input !w-28" /></div>
          <SubmitButton pendingText="Enregistrement…">Enregistrer</SubmitButton>
        </form>

        <div className="space-y-4">
          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between px-[15px] pt-[13px] pb-2">
              <div className="card-title">Jours feries <span className="text-[10px] font-normal text-ink-faint">{cal.holidays.length} date{cal.holidays.length > 1 ? "s" : ""}</span></div>
            </div>
            <table className="tbl">
              <thead><tr><th className="w-36">Date</th><th>Libelle</th><th>Jour</th><th>Recurrence</th><th className="w-40"></th></tr></thead>
              <tbody>
                {cal.holidays.map((h) => {
                  const past = !h.recurring && h.day < t0;
                  return (
                    <tr key={h.id} className={past ? "opacity-60" : ""}>
                      <td colSpan={4}>
                        <form action={updateHoliday} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="id" value={h.id} />
                          <input type="date" name="day" defaultValue={h.day} className="input !w-36 !py-1" />
                          <input name="label" defaultValue={h.label} className="input !w-64 !py-1" />
                          <span className="w-16 text-ink-muted">{WEEKDAYS[isoWeekday(h.day) - 1].short}. {formatDate(h.day).slice(0, 5)}</span>
                          <label className="flex items-center gap-1 text-[10px] text-ink-muted"><input type="checkbox" name="recurring" defaultChecked={h.recurring} /> chaque annee</label>
                          {h.recurring ? <Badge tone="info">Annuel</Badge> : past ? <Badge tone="neutral">Passe</Badge> : <Badge tone="ok">Ponctuel</Badge>}
                          <SubmitButton className="btn-secondary !py-1" pendingText="…">Enregistrer</SubmitButton>
                        </form>
                      </td>
                      <td className="num">
                        <form action={deleteHoliday}><input type="hidden" name="id" value={h.id} /><button className="btn-ghost text-ink-faint hover:text-alert" title="Supprimer">×</button></form>
                      </td>
                    </tr>
                  );
                })}
                {cal.holidays.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-ink-muted">Aucun jour ferie.</td></tr>}
              </tbody>
            </table>
          </div>

          <form action={addHoliday} className="card card-pad space-y-3">
            <div className="card-title">Ajouter un jour ferie</div>
            <p className="hint">Les fetes a date fixe se declarent une fois avec « chaque annee ». Les fetes a date mobile (Korite, Tabaski, Paques, Ascension, Pentecote, Tamkharit, Maouloud) s&apos;ajoutent annee par annee.</p>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto_auto] sm:items-end">
              <div><label className="label">Date</label><DateInput name="day" required className="input" /></div>
              <div><label className="label">Libelle</label><input name="label" required placeholder="Ex. Tabaski" className="input" /></div>
              <label className="flex items-center gap-2 pb-2 text-[10.5px]"><input type="checkbox" name="recurring" /> Chaque annee</label>
              <SubmitButton>Ajouter</SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
