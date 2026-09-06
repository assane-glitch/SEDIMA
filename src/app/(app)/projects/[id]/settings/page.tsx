import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { ProjectHeader } from "../ProjectHeader";
import { SubmitButton } from "@/components/ui/SubmitButton";

import { ProjectForm } from "@/components/ProjectForm";
import { canEdit, requireProfile } from "@/lib/session";
import { deleteProject, freezeBaseline, updateProject } from "../../actions";
import { formatDate } from "@/lib/format";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ProjectSettingsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const profile = await requireProfile();
  if (!canEdit(profile)) redirect(`/projects/${id}`);
  const { project, people, tasks } = await loadProject(id);
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
      <form action={deleteProject} className="mt-6 flex justify-end">
        <input type="hidden" name="id" value={id} />
        <SubmitButton className="btn-danger" pendingText="Suppression…">Supprimer le projet et toutes ses donnees</SubmitButton>
      </form>
    </div>
  );
}
