import type { Profile, Project } from "@/lib/types";
import { PROJECT_STATUS_LABELS } from "@/lib/types";
import { today } from "@/lib/format";

export function ProjectForm({ project, people, action, submitLabel }: { project?: Project; people: Profile[]; action: (fd: FormData) => Promise<void>; submitLabel: string }) {
  const managers = people.filter((p) => p.role === "admin" || p.role === "manager");
  return (
    <form action={action} className="card space-y-4 p-6">
      {project && <input type="hidden" name="id" value={project.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="code">Code</label>
          <input id="code" name="code" required defaultValue={project?.code} placeholder="PRJ-001" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Nom du projet</label>
          <input id="name" name="name" required defaultValue={project?.name} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={2} defaultValue={project?.description} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="start_date">Debut</label>
          <input id="start_date" name="start_date" type="date" required defaultValue={project?.start_date ?? today()} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="end_date">Fin</label>
          <input id="end_date" name="end_date" type="date" required defaultValue={project?.end_date} className="input" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="budget">Budget</label>
          <input id="budget" name="budget" type="number" min={0} step="1" defaultValue={project?.budget ?? 0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="currency">Devise</label>
          <select id="currency" name="currency" defaultValue={project?.currency ?? "XOF"} className="input">
            <option value="XOF">XOF (FCFA)</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Statut</label>
          <select id="status" name="status" defaultValue={project?.status ?? "planning"} className="input">
            {Object.entries(PROJECT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="manager_id">Chef de projet</label>
        <select id="manager_id" name="manager_id" defaultValue={project?.manager_id ?? ""} className="input">
          <option value="">—</option>
          {managers.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
        </select>
      </div>
      <div className="flex justify-end"><button type="submit" className="btn-primary">{submitLabel}</button></div>
    </form>
  );
}
