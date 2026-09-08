import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { ProjectHeader } from "../ProjectHeader";
import { SubmitButton } from "@/components/ui/SubmitButton";

import { ProjectForm } from "@/components/ProjectForm";
import { canEdit, requireProfile } from "@/lib/session";
import { freezeBaseline, updateProject } from "../../actions";
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
    <div className="mx-auto max-w-2xl">
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {ok && <div className="mb-4"><Alert tone="ok">{ok}</Alert></div>}
      <ProjectForm project={project} people={people} action={updateProject} submitLabel="Enregistrer" />
      <section className="card card-pad mt-4">
        <div className="card-title">Planning de reference</div>
        <p className="hint mt-1">La reference est le planning fige, compare au planning actuel dans le Gantt (bouton « Reference »). Elle se fixe une premiere fois en figeant le planning, puis ne change que par une demande de changement approuvee dans le registre.</p>
        <div className="mt-3 flex items-center justify-between gap-4 text-[10.5px]">
          <div className="text-ink-muted">{frozen} ligne{frozen > 1 ? "s" : ""} avec une reference · {drift} en ecart avec le planning actuel · projet du {formatDate(project.start_date)} au {formatDate(project.end_date)}</div>
          {frozen === 0
            ? <form action={freezeBaseline}><input type="hidden" name="id" value={id} /><SubmitButton className="btn-secondary" pendingText="Figeage…">▭ Figer le planning actuel comme reference</SubmitButton></form>
            : <Link href={`/projects/${id}/changes`} className="btn-secondary">Registre des changements</Link>}
        </div>
      </section>
      <section className="card card-pad mt-4">
        <div className="card-title">Calendrier de travail</div>
        <p className="hint mt-1">Commun a tous les projets : le Gantt grise les jours chomes et le tiroir d&apos;une tache affiche sa duree en jours ouvres.</p>
        <div className="mt-3 flex items-center justify-between gap-4 text-[10.5px]">
          <div className="text-ink-muted">Jours ouvres : {workLabel} · {cal.hoursPerDay} h par jour · {cal.holidays.length} jour{cal.holidays.length > 1 ? "s" : ""} ferie{cal.holidays.length > 1 ? "s" : ""}</div>
          {profile.role === "admin" && <Link href="/admin/calendar" className="btn-secondary">Gerer le calendrier</Link>}
        </div>
      </section>
      <DeleteProjectForm projectId={id} code={project.code} name={project.name} counts={{ tasks: tasks.length, expenses: expenses ?? 0, documents: documents ?? 0 }} />
    </div>
  );
}
