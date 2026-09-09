import { Gantt, type GanttMilestone, type GanttRow } from "@/components/gantt/Gantt";
import { formatMoney } from "@/lib/format";
import { projectHealth } from "@/lib/health";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { type Milestone, type Profile, type Project, type ProjectStats } from "@/lib/types";
import { PortfolioToolbar } from "@/components/projects/PortfolioToolbar";
import { PortfolioBand } from "@/components/projects/PortfolioBand";
import { getCalendar } from "@/lib/calendar";

export const metadata = { title: "Planning" };

export default async function PortfolioPlanningPage({ searchParams }: { searchParams: Promise<{ category?: string; status?: string; fav?: string }> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  let q = supabase.from("projects").select("*").neq("status", "hors_perimetre").order("start_date");
  if (sp.category) q = q.eq("category", sp.category);
  if (sp.status) q = q.eq("status", sp.status);
  const [{ data: projects }, { data: stats }, { data: people }, { data: ms }, calendar, { data: favRows }] = await Promise.all([
    q, supabase.from("project_stats").select("*"), supabase.from("profiles").select("id,email,full_name,role"), supabase.from("milestones").select("*"), getCalendar(),
    supabase.from("user_favorites").select("project_id").eq("user_id", profile.id),
  ]);
  const favorites = new Set((favRows ?? []).map((f) => f.project_id));
  const onlyFav = sp.fav === "1";
  const list = ((projects ?? []) as Project[]).filter((p) => !onlyFav || favorites.has(p.id));
  const statMap = new Map(((stats ?? []) as ProjectStats[]).map((s) => [s.project_id, s]));
  const who = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p.full_name || p.email]));
  const rows: GanttRow[] = list.map((p) => {
    const s = statMap.get(p.id);
    return { id: p.id, kind: "project", code: p.code, name: `${p.code} · ${p.name}`, href: `/projects/${p.id}/planning`, start: p.start_date, end: p.end_date,
      progress: Number(s?.progress ?? 0), budget: Number(p.budget), spent: Number(s?.spent ?? 0), responsible: (p.manager_id && who.get(p.manager_id)) || p.manager_name || undefined, health: projectHealth(p, s) };
  });
  const ids = new Set(list.map((p) => p.id));
  const milestones: GanttMilestone[] = ((ms ?? []) as Milestone[]).filter((m) => ids.has(m.project_id)).map((m) => ({ id: m.id, name: m.name, due: m.due_date, reached: m.reached_on, rowId: m.project_id }));
  const start = list.reduce((m, p) => (p.start_date < m ? p.start_date : m), list[0]?.start_date ?? new Date().toISOString().slice(0, 10));
  const end = list.reduce((m, p) => (p.end_date > m ? p.end_date : m), list[0]?.end_date ?? start);
  const totalBudget = list.reduce((s, p) => s + Number(p.budget), 0);

  return (
    <>
      <PortfolioBand flush crumbs={[{ href: "/projects", label: "Projets" }]} title="Planning du portefeuille" subtitle={`Planning multi-projets · ${list.length} projet${list.length > 1 ? "s" : ""} · ${formatMoney(totalBudget)}`}>
        <PortfolioToolbar view="planning" params={{ category: sp.category, status: sp.status, fav: sp.fav }} favCount={favorites.size} embedded />
      </PortfolioBand>
      <Gantt mode="portfolio" rows={rows} milestones={milestones} people={(people ?? []) as Profile[]} currency="XOF" canEdit={canEdit(profile)} projectStart={start} projectEnd={end} calendar={calendar} />
      <p className="hint mt-2">Une barre par projet, du debut a la fin prevus, remplie selon l&apos;avancement. Les losanges sont les jalons. Cliquez sur un projet pour ouvrir son planning detaille. Les projets hors perimetre ne sont pas affiches.</p>
    </>
  );
}
