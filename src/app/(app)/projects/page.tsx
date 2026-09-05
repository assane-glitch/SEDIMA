import Link from "next/link";
import { Badge, CategoryIcon, Empty, PageHeader, ProgressBar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDate, formatMoney } from "@/lib/format";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS, PROJECT_CATEGORIES, PROJECT_STATUS_LABELS, type Profile, type Project, type ProjectStats } from "@/lib/types";

export const metadata = { title: "Projets" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ category?: string; status?: string }> }) {
  const { category, status } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  let q = supabase.from("projects").select("*").order("start_date", { ascending: false });
  if (category) q = q.eq("category", category);
  if (status) q = q.eq("status", status);
  const [{ data: projects }, { data: stats }, { data: people }] = await Promise.all([
    q, supabase.from("project_stats").select("*"), supabase.from("profiles").select("id,email,full_name,role"),
  ]);
  const list = (projects ?? []) as Project[];
  const statMap = new Map(((stats ?? []) as ProjectStats[]).map((s) => [s.project_id, s]));
  const peopleMap = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p]));
  const chip = (active: boolean) => `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${active ? "border-ink-900 bg-ink-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`;

  return (
    <>
      <PageHeader title="Projets" subtitle={`${list.length} projet${list.length > 1 ? "s" : ""}`}
        actions={canEdit(profile) && <Link href="/projects/new" className="btn-primary"><Icon name="plus" className="h-4 w-4" />Nouveau projet</Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/projects" className={chip(!category)}>Toutes</Link>
        {PROJECT_CATEGORIES.map((c) => (
          <Link key={c.value} href={`/projects?category=${c.value}`} className={chip(category === c.value)}>
            <CategoryIcon category={c.value} className={`h-3.5 w-3.5 ${category === c.value ? "invert" : ""}`} />{c.label}
          </Link>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty title={category ? "Aucun projet dans cette categorie" : "Aucun projet"} hint={canEdit(profile) ? "Creez votre premier projet." : undefined} action={canEdit(profile) ? { href: "/projects/new", label: "Creer un projet" } : undefined} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2">Projet</th><th className="hidden px-4 py-2 md:table-cell">Chef de projet</th><th className="hidden px-4 py-2 md:table-cell">Periode</th><th className="px-4 py-2">Avancement</th><th className="hidden px-4 py-2 text-right lg:table-cell">Budget</th><th className="px-4 py-2 text-right">Depense</th><th className="hidden px-4 py-2 md:table-cell">Statut</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((p) => {
                const s = statMap.get(p.id); const spent = Number(s?.spent ?? 0); const over = spent > Number(p.budget) && Number(p.budget) > 0;
                const manager = p.manager_id ? peopleMap.get(p.manager_id) : undefined;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CategoryIcon category={p.category} className="h-7 w-7 shrink-0 opacity-80" />
                        <div>
                          <Link href={`/projects/${p.id}`} className="font-medium text-ink-900 hover:text-brand-700 hover:underline">{p.name}</Link>
                          <div className="text-xs text-slate-500">{p.code} · {CATEGORY_LABELS[p.category]}{s?.late_count ? ` · ${s.late_count} en retard` : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{manager?.full_name || manager?.email || "—"}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 md:table-cell">{formatDate(p.start_date)} → {formatDate(p.end_date)}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-24"><ProgressBar value={Number(s?.progress ?? 0)} tone={s?.late_count ? "warn" : "good"} /></div><span className="text-xs tabular-nums">{Number(s?.progress ?? 0)} %</span></div></td>
                    <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">{formatMoney(Number(p.budget), p.currency)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${over ? "font-medium text-brand-700" : ""}`}>{formatMoney(spent, p.currency)}</td>
                    <td className="hidden px-4 py-3 md:table-cell"><Badge tone={p.status === "active" ? "green" : p.status === "on_hold" ? "amber" : "slate"}>{PROJECT_STATUS_LABELS[p.status]}</Badge></td>
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
