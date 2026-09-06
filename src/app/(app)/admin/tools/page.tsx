import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Stat } from "@/components/ui";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { RealignTool } from "./RealignTool";

export const metadata = { title: "Outils" };

export default async function ToolsPage() {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: projects }, { data: tasks }, { data: docs }, { count: audit }, { count: expenses }] = await Promise.all([
    supabase.from("projects").select("id,code,name").neq("status", "hors_perimetre").order("code"),
    supabase.from("tasks").select("id,project_id,start_date,end_date,depends_on,link_type,lag_weeks"),
    supabase.from("documents").select("size_bytes"),
    supabase.from("audit_log").select("*", { count: "exact", head: true }),
    supabase.from("expenses").select("*", { count: "exact", head: true }),
  ]);
  const all = tasks ?? []; const byId = new Map(all.map((t) => [t.id, t]));
  const monday = (iso: string) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d; };
  const toFix = (pid: string) => all.filter((t) => t.project_id === pid && t.depends_on && byId.get(t.depends_on)).filter((t) => { const p = byId.get(t.depends_on!)!; const m = monday(t.link_type === "DD" ? p.start_date : p.end_date); m.setUTCDate(m.getUTCDate() + 7 * (1 + Math.max(0, t.lag_weeks ?? 0))); return t.start_date < m.toISOString().slice(0, 10); }).length;
  const list = (projects ?? []).map((p) => ({ ...p, toFix: toFix(p.id) }));
  const bytes = (docs ?? []).reduce((s, d) => s + Number(d.size_bytes), 0);
  return (
    <>
      <Link href="/admin" className="text-[10px] text-ink-muted">‹ Administration</Link>
      <PageHeader title="Outils et etat de la base" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Taches" value={all.length} hint={`${list.length} projets`} />
        <Stat label="Depenses" value={expenses ?? 0} />
        <Stat label="Documents" value={(docs ?? []).length} hint={`${(bytes / 1048576).toFixed(1)} Mo sur 1 Go (offre gratuite)`} />
        <Stat label="Modifications tracees" value={audit ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <div className="card-title mb-1">Realigner les taches liees</div>
          <p className="hint mb-3">Applique la regle « une tache liee demarre au plus tot la semaine suivant son predecesseur, plus le decalage » aux taches existantes. Utile apres un import. Les nouvelles saisies sont deja recalees automatiquement.</p>
          <RealignTool projects={list} />
        </div>
        <div className="card card-pad">
          <div className="card-title mb-1">Sauvegardes et exports</div>
          <p className="hint mb-3">Supabase conserve des sauvegardes quotidiennes du projet. Pour un export complet lisible, utilisez les CSV de la page Rapports (taches, depenses, journal, registres, jalons, projets).</p>
          <Link href="/reports" className="btn-secondary">Ouvrir les exports</Link>
        </div>
      </div>
    </>
  );
}
