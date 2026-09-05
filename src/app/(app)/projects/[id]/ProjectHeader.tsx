import { Badge, CategoryIcon } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { CATEGORY_LABELS, PROJECT_STATUS_LABELS, type Profile, type Project } from "@/lib/types";

export function ProjectHeader({ project, manager }: { project: Project; manager?: Profile }) {
  return (
    <div className="mb-5 flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100"><CategoryIcon category={project.category} className="h-7 w-7 opacity-80" /></div>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{project.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
          <span>{project.code}</span>·<span>{CATEGORY_LABELS[project.category]}</span>·<span>{formatDate(project.start_date)} → {formatDate(project.end_date)}</span>·
          <span>Chef de projet : {manager ? (manager.full_name || manager.email) : "—"}</span>
          <Badge tone={project.status === "active" ? "green" : project.status === "on_hold" ? "amber" : "slate"}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
        </div>
      </div>
    </div>
  );
}
