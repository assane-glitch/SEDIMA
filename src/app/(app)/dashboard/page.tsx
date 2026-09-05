import Link from "next/link";
import { Badge, CategoryIcon, Empty, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { formatDate, formatMoney, pct } from "@/lib/format";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_STATUSES, PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE, type Profile, type Project, type ProjectStats } from "@/lib/types";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: projects }, { data: stats }, { data: people }] = await Promise.all([
    supabase.from("projects").select("*").order("start_date", { ascending: false }),
    supabase.from("project_stats").select("*"),
    supabase.from("profiles").select("id,email,full_name,role"),
  ]);
  const list = (projects ?? []) as Project[];
  const statMap = new Map(((stats ?? []) as ProjectStats[]).map((s) => [s.project_id, s]));
  const peopleMap = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p]));

  const totalBudget = list.reduce((s, p) => s + Number(p.budget), 0);
  const totalSpent = list.reduce((s, p) => s + Number(statMap.get(p.id)?.spent ?? 0), 0);
  const active = list.filter((p) => ACTIVE_STATUSES.includes(p.status)).length;
  const late = list.reduce((s, p) => s + Number(statMap.get(p.id)?.late_count ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={`${list.length} projet${list.length > 1 ? "s" : ""}, ${active} en cours`}
        actions={<Link href="/projects" className="btn-secondary">Tous les projets</Link>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Budget total" value={formatMoney(totalBudget)} />
        <Stat label="Depense" value={formatMoney(totalSpent)} hint={`${pct(totalSpent, totalBudget)} % du budget`} tone={totalSpent > totalBudget ? "bad" : "default"} />
        <Stat label="Projets en cours" value={active} />
        <Stat label="Taches en retard" value={late} tone={late > 0 ? "warn" : "good"} />
      </div>

      {list.length === 0 ? (
        <Empty
          title="Aucun projet pour le moment"
          hint={canEdit(profile) ? "Creez votre premier projet pour afficher le Gantt, le budget et l'avancement." : "Un chef de projet doit d'abord creer un projet."}
          action={canEdit(profile) ? { href: "/projects/new", label: "Creer un projet" } : undefined}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th className="px-4 py-2">Projet</th>
                <th className="hidden px-4 py-2 md:table-cell">Responsable</th>
                <th className="hidden px-4 py-2 md:table-cell">Periode</th>
                <th className="px-4 py-2">Avancement</th>
                <th className="hidden px-4 py-2 text-right lg:table-cell">Budget</th>
                <th className="px-4 py-2 text-right">Depense</th>
                <th className="hidden px-4 py-2 md:table-cell">Statut</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const s = statMap.get(p.id);
                const spent = Number(s?.spent ?? 0);
                const over = spent > Number(p.budget) && Number(p.budget) > 0;
                const progress = Number(s?.progress ?? 0);
                const manager = p.manager_id ? peopleMap.get(p.manager_id) : undefined;
                return (
                  <tr key={p.id} className="hover:bg-surface-alt">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CategoryIcon category={p.category} className="h-6 w-6 shrink-0 opacity-80" />
                        <div>
                          <Link href={`/projects/${p.id}`} className="font-semibold text-ink-900 hover:text-ink hover:underline">{p.name}</Link>
                          <div className="text-[10px] text-ink-muted">{p.code}{s?.late_count ? ` · ${s.late_count} en retard` : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{manager?.full_name || manager?.email || p.manager_name || "—"}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-ink-body md:table-cell">{formatDate(p.start_date)} → {formatDate(p.end_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24"><ProgressBar value={progress} tone={s?.late_count ? "warn" : "good"} /></div>
                        <span className="text-[10px] tabular-nums">{progress} %</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">{formatMoney(Number(p.budget), p.currency)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${over ? "font-semibold text-alert" : ""}`}>{formatMoney(spent, p.currency)}</td>
                    <td className="hidden px-4 py-3 md:table-cell"><Badge tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
