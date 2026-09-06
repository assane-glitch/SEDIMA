import { HistoryList, type HistoryItem } from "@/components/history/HistoryList";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { AuditEntry } from "@/lib/types";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ProjectHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ project, people }, { data: au }] = await Promise.all([loadProject(id), supabase.from("audit_log").select("*").eq("project_id", id).order("changed_at", { ascending: false }).limit(1500)]);
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const items: HistoryItem[] = ((au ?? []) as AuditEntry[]).map((a) => ({ ...a, author: (a.changed_by && who.get(a.changed_by)) || "Systeme", currency: project.currency }));
  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={canEdit(profile)} />
      <HistoryList items={items} />
    </>
  );
}
