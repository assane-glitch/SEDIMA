import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { ProjectHeader } from "../ProjectHeader";
import { SubmitButton } from "@/components/ui/SubmitButton";

import { ProjectForm } from "@/components/ProjectForm";
import { canEdit, requireProfile } from "@/lib/session";
import { alignBaseline, freezeBaseline, setBaselineLock, updateProject } from "../../actions";
import { DeleteProjectForm } from "@/components/projects/DeleteProjectForm";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { WEEKDAYS, getCalendar } from "@/lib/calendar";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ProjectSettingsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const profile = await requireProfile();
  if (!canEdit(profile)) redirect(`/projects/${id}`);
  const supabase = await createClient();
  const [{ project, people, tasks }, cal, { count: expenses }, { count: documents }] = await Promise.all([
    loadProject(id), getCalendar(),
    supabase.from("expenses").select("*", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("project_id", id),
  ]);
  const workLabel = WEEKDAYS.filter((w) => cal.workDays.includes(w.value)).map((w) => w.short).join(", ");
  const frozen = tasks.filter((t) => t.baseline_start).length;
  const drift = tasks.filter((t) => t.baseline_start && (t.baseline_start !== t.start_date || t.baseline_end !== t.end_date)).length;
  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {ok && <div className="mb-4"><Alert tone="ok">{ok}</Alert></div>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <ProjectForm project={project} people={people} action={updateProject} submitLabel="Enregistrer" />
      <div className="grid gap-4">
      <section className="card card-pad">
        <div className="card-title">Planning de reference</div>
        <p className="hint mt-1">La reference est le planning fige, compare au planning actuel dans le Gantt (bouton « Reference »). Elle se fixe une premiere fois en figeant le planning, puis ne change que par une demande de changement approuvee dans le registre.</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10.5px]">
          <div className="text-ink-muted">{frozen} ligne{frozen > 1 ? "s" : ""} avec une reference · {drift} en ecart avec le planning actuel · projet du {formatDate(project.start_date)} au {formatDate(project.end_date)}</div>
          {frozen === 0
            ? <form action={freezeBaseline}><input type="hidden" name="id" value={id} /><SubmitButton className="btn-secondary" pendingText="Figeage…">▭ Figer le planning actuel comme reference</SubmitButton></form>
            : <Link href={`/projects/${id}/changes`} className="btn-secondary">Registre des changements</Link>}
        </div>
        <div className="mt-4 border-t border-line-hair pt-3">
          <div className="flex items-center gap-2 text-[10.5px]"><span className={`dot ${project.baseline_locked ? "bg-ink" : "bg-warn-dot"}`} /><span className="font-semibold text-ink">{project.baseline_locked ? "Reference verrouillee" : "Reference deverrouillee"}</span>{!project.baseline_locked && project.baseline_unlocked_at && <span className="text-ink-faint">depuis le {formatDate(project.baseline_unlocked_at.slice(0, 10))}{project.baseline_unlocked_by ? ` par ${people.find((p) => p.id === project.baseline_unlocked_by)?.full_name ?? "un administrateur"}` : ""}</span>}</div>
          <p className="hint mt-1">{project.baseline_locked
            ? "Structure des lots et taches, noms, responsables et budgets sont figes. Les dates ne changent que par une demande de changement approuvee. Seul un administrateur peut deverrouiller."
            : "Les administrateurs et editeurs peuvent ajouter, renommer ou supprimer des lots et des taches, changer responsables et budgets ; les dates de reference sont modifiables et alignables sur le planning. Reverrouillez une fois la reference stabilisee."}</p>
          {profile.role === "admin" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={setBaselineLock}><input type="hidden" name="id" value={id} /><input type="hidden" name="locked" value={project.baseline_locked ? "0" : "1"} /><SubmitButton className={project.baseline_locked ? "btn-secondary" : "btn-primary"} pendingText="…">{project.baseline_locked ? "Deverrouiller la reference" : "Verrouiller la reference"}</SubmitButton></form>
              {!project.baseline_locked && frozen > 0 && <form action={alignBaseline}><input type="hidden" name="id" value={id} /><SubmitButton className="btn-secondary" pendingText="Alignement…">Aligner la reference sur le planning actuel{drift ? ` (${drift} en ecart)` : ""}</SubmitButton></form>}
            </div>
          )}
        </div>
      </section>
      <section className="card card-pad">
        <div className="card-title">Calendrier de travail</div>
        <p className="hint mt-1">Commun a tous les projets : le Gantt grise les jours chomes et le tiroir d&apos;une tache affiche sa duree en jours ouvres.</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10.5px]">
          <div className="text-ink-muted">Jours ouvres : {workLabel} · {cal.hoursPerDay} h par jour · {cal.holidays.length} jour{cal.holidays.length > 1 ? "s" : ""} ferie{cal.holidays.length > 1 ? "s" : ""}</div>
          {profile.role === "admin" && <Link href="/admin/calendar" className="btn-secondary">Gerer le calendrier</Link>}
        </div>
      </section>
      <DeleteProjectForm projectId={id} code={project.code} name={project.name} counts={{ tasks: tasks.length, expenses: expenses ?? 0, documents: documents ?? 0 }} />
      </div>
      </div>
    </>
  );
}
