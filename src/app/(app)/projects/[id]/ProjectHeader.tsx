import type { ReactNode } from "react";
import { FavoriteStar } from "@/components/projects/FavoriteStar";
import { ProjectCrumb } from "./ProjectCrumb";
import { Badge, CategoryIcon } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { CATEGORY_LABELS, PROJECT_STATUS_LABELS, type Profile, type Project } from "@/lib/types";

export function ProjectHeader({ project, manager, favorite, actions }: { project: Project; manager?: Profile; favorite?: boolean; actions?: ReactNode }) {
  return (
    <>
    <ProjectCrumb id={project.id} code={project.code} name={project.name} />
    <div className="mb-5 flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-sub"><CategoryIcon category={project.category} className="h-7 w-7" /></div>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 truncate text-[16px] font-semibold tracking-tight">{project.name}{favorite !== undefined && <FavoriteStar projectId={project.id} favorite={favorite} />}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-ink-muted">
          <span>{project.code}</span>·<span>{CATEGORY_LABELS[project.category]}</span>·<span>{formatDate(project.start_date)} → {formatDate(project.end_date)}</span>·
          {(project.site || project.business_unit) && <><span>{[project.site, project.business_unit].filter(Boolean).join(" · ")}</span>·</>}
          <span>Chef de projet : {manager ? (manager.full_name || manager.email) : project.manager_name || "—"}</span>
          <Badge>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          {project.baseline_locked ? <Badge>🔒 Reference verrouillee</Badge> : <Badge tone="warn">Reference deverrouillee</Badge>}
        </div>
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
    </div>
    </>
  );
}
