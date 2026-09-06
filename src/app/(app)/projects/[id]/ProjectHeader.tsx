import { FavoriteStar } from "@/components/projects/FavoriteStar";
import { Badge, CategoryIcon } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { CATEGORY_LABELS, PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE, type Profile, type Project } from "@/lib/types";

export function ProjectHeader({ project, manager, favorite }: { project: Project; manager?: Profile; favorite?: boolean }) {
  return (
    <div className="mb-5 flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-sub"><CategoryIcon category={project.category} className="h-7 w-7 opacity-80" /></div>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 truncate text-[16px] font-semibold tracking-tight">{project.name}{favorite !== undefined && <FavoriteStar projectId={project.id} favorite={favorite} />}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-ink-muted">
          <span>{project.code}</span>·<span>{CATEGORY_LABELS[project.category]}</span>·<span>{formatDate(project.start_date)} → {formatDate(project.end_date)}</span>·
          {(project.site || project.business_unit) && <><span>{[project.site, project.business_unit].filter(Boolean).join(" · ")}</span>·</>}
          <span>Chef de projet : {manager ? (manager.full_name || manager.email) : project.manager_name || "—"}</span>
          <Badge tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
        </div>
      </div>
    </div>
  );
}
