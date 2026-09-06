import type { GanttRow } from "@/components/gantt/Gantt";
import { lotHealth, taskHealth } from "@/lib/health";
import type { Task } from "@/lib/types";

export function buildRows(tasks: Task[], spentByTask: Map<string, number>, who: Map<string, string>): GanttRow[] {
  const byParent = new Map<string | null, Task[]>();
  for (const t of tasks) { const k = t.parent_id ?? null; byParent.set(k, [...(byParent.get(k) ?? []), t]); }
  const sortT = (a: Task, b: Task) => a.sort_order - b.sort_order || a.start_date.localeCompare(b.start_date);
  const rows: GanttRow[] = [];
  const taskRow = (t: Task, parentId: string | null): GanttRow => ({
    id: t.id, kind: "task", parentId, code: t.wbs_code, name: t.name, start: t.start_date, end: t.end_date, progress: t.progress,
    budget: Number(t.budget), spent: spentByTask.get(t.id) ?? 0, responsible: t.responsible_id ? who.get(t.responsible_id) : t.responsible_role,
    health: taskHealth({ status: t.status, progress: t.progress, start: t.start_date, end: t.end_date }), dependsOn: t.depends_on, linkType: t.link_type, task: t,
  });
  for (const top of (byParent.get(null) ?? []).sort(sortT)) {
    const children = (byParent.get(top.id) ?? []).sort(sortT);
    if (children.length === 0) { rows.push(taskRow(top, null)); continue; }
    const childRows = children.map((c) => taskRow(c, top.id));
    const budget = childRows.reduce((s, c) => s + c.budget, 0);
    const spent = childRows.reduce((s, c) => s + c.spent, 0);
    const progress = budget > 0 ? Math.round(childRows.reduce((s, c) => s + c.progress * c.budget, 0) / budget) : Math.round(childRows.reduce((s, c) => s + c.progress, 0) / childRows.length);
    const start = childRows.reduce((m, c) => (c.start < m ? c.start : m), childRows[0].start);
    const end = childRows.reduce((m, c) => (c.end > m ? c.end : m), childRows[0].end);
    rows.push({ id: top.id, kind: "lot", code: top.wbs_code, name: top.name, start, end, progress, budget, spent,
      responsible: top.responsible_id ? who.get(top.responsible_id) : top.responsible_role, health: lotHealth(childRows.map((c) => c.health!)), task: { ...top, progress, budget, start_date: start, end_date: end } });
    rows.push(...childRows);
  }
  return rows;
}
