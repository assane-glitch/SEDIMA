import type { GanttRow } from "@/components/gantt/Gantt";
import type { Task } from "@/lib/types";

export function buildRows(tasks: Task[], spentByTask: Map<string, number>, who: Map<string, string>): GanttRow[] {
  const byParent = new Map<string | null, Task[]>();
  for (const t of tasks) { const k = t.parent_id ?? null; byParent.set(k, [...(byParent.get(k) ?? []), t]); }
  const sortT = (a: Task, b: Task) => a.sort_order - b.sort_order || a.start_date.localeCompare(b.start_date);
  const rows: GanttRow[] = [];
  for (const top of (byParent.get(null) ?? []).sort(sortT)) {
    const children = (byParent.get(top.id) ?? []).sort(sortT);
    const resp = top.responsible_id ? who.get(top.responsible_id) : top.responsible_role;
    if (children.length === 0) {
      rows.push({ id: top.id, kind: "task", code: top.wbs_code, name: top.name, start: top.start_date, end: top.end_date, progress: top.progress, budget: Number(top.budget), spent: spentByTask.get(top.id) ?? 0, responsible: resp, dependsOn: top.depends_on, linkType: top.link_type, task: top });
      continue;
    }
    const budget = children.reduce((s, c) => s + Number(c.budget), 0);
    const spent = children.reduce((s, c) => s + (spentByTask.get(c.id) ?? 0), 0);
    const progress = budget > 0 ? Math.round(children.reduce((s, c) => s + c.progress * Number(c.budget), 0) / budget) : Math.round(children.reduce((s, c) => s + c.progress, 0) / children.length);
    const start = children.reduce((m, c) => (c.start_date < m ? c.start_date : m), top.start_date);
    const end = children.reduce((m, c) => (c.end_date > m ? c.end_date : m), top.end_date);
    rows.push({ id: top.id, kind: "lot", code: top.wbs_code, name: top.name, start, end, progress, budget, spent, responsible: resp, task: { ...top, progress, budget } });
    for (const c of children) {
      rows.push({ id: c.id, kind: "task", parentId: top.id, code: c.wbs_code, name: c.name, start: c.start_date, end: c.end_date, progress: c.progress, budget: Number(c.budget), spent: spentByTask.get(c.id) ?? 0, responsible: c.responsible_id ? who.get(c.responsible_id) : c.responsible_role, dependsOn: c.depends_on, linkType: c.link_type, task: c });
    }
  }
  return rows;
}

