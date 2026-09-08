import Link from "next/link";
import { describeAudit, relativeTime } from "@/lib/audit";
import { addDays, daysBetween, formatDate, formatMoney, pct, shortMoney, today } from "@/lib/format";
import { HEALTH_DOT, HEALTH_LABELS, projectHealth } from "@/lib/health";
import { baselineDrift, computeEvm, criticalPath, fmtIndex, indexStatus, type IndexStatus, type ProgressEvent } from "@/lib/evm";
import { getLists } from "@/lib/reference";
import { excludedStatuses, labelOf } from "@/lib/reference-types";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { AuditEntry, JournalEntry, Milestone, Task } from "@/lib/types";
import { EvmChart } from "@/components/projects/overview/EvmChart";
import { OverviewTasks } from "@/components/projects/overview/OverviewTasks";
import { Sparkline } from "@/components/projects/overview/Sparkline";
import { MilestonesCard } from "./MilestonesCard";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectTabs } from "./ProjectTabs";
import { loadProject } from "./loadProject";

const STATUS_DOT: Record<IndexStatus, string> = { ok: "bg-ok", warn: "bg-warn-dot", alert: "bg-alert", idle: "bg-neutral-dot" };
const SEQ = ["bg-chart-seq-1", "bg-chart-seq-2", "bg-chart-seq-3", "bg-chart-seq-4", "bg-chart-seq-5", "bg-chart-seq-6"];
const PIPE: { value: string; cls: string }[] = [{ value: "payee", cls: "bg-chart-seq-1" }, { value: "facturee", cls: "bg-chart-seq-2" }, { value: "livree", cls: "bg-chart-seq-3" }, { value: "commandee", cls: "bg-chart-seq-4" }, { value: "da_emise", cls: "bg-chart-seq-5" }];
type Decision = { tone: "alert" | "warn" | "info"; text: string; href: string; action: string };

function Card({ title, action, children, className = "" }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`card card-pad min-w-0 ${className}`}><div className="mb-3 flex items-center justify-between gap-3"><h2 className="card-title">{title}</h2>{action}</div>{children}</section>;
}
/** Indice heros : valeur, statut par point, tendance sur 8 semaines, definition au survol. */
function Hero({ label, value, status, hint, help, trend, baseline }: { label: string; value: string; status: IndexStatus; hint: string; help: string; trend?: (number | null)[]; baseline?: number }) {
  return (
    <div className="min-w-0" title={help}>
      <div className="eyebrow">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-[18px] font-bold tabular-nums tracking-[-0.01em] text-ink"><span className={`dot ${STATUS_DOT[status]}`} />{value}</div>
      <div className="hint mt-0.5 truncate">{hint}</div>
      {trend && <div className="mt-2"><Sparkline values={trend} baseline={baseline} /></div>}
    </div>
  );
}
function Row({ k, v, sub, strong }: { k: string; v: React.ReactNode; sub?: string; strong?: boolean }) {
  return <div className="flex items-baseline justify-between gap-3 py-1.5 text-[10.5px]"><span className="text-ink-muted" title={sub}>{k}</span><span className={`tabular-nums ${strong ? "font-bold text-ink" : "text-ink"}`}>{v}</span></div>;
}

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const t0 = today();
  const [{ project, stats, tasks, people }, lists, { data: milestones }, { data: journal }, { data: audit }, { data: history }, { data: expenses }, { data: crs }, { count: incidents }] = await Promise.all([
    loadProject(id), getLists(),
    supabase.from("milestones").select("*").eq("project_id", id).order("due_date"),
    supabase.from("journal_entries").select("*").eq("project_id", id).order("entry_date", { ascending: false }).limit(4),
    supabase.from("audit_log").select("*").eq("project_id", id).order("changed_at", { ascending: false }).limit(8),
    supabase.from("audit_log").select("record_id,changed_at,action,new_data").eq("project_id", id).eq("table_name", "tasks").or("action.eq.insert,changed_fields.cs.{progress}").order("changed_at").limit(5000),
    supabase.from("expenses").select("amount,spent_on,category,status").eq("project_id", id),
    supabase.from("change_requests").select("id,title,status,requested_at,change_request_items(old_end,new_end)").eq("project_id", id),
    supabase.from("register_entries").select("*", { count: "exact", head: true }).eq("project_id", id).eq("register_type", "incident").gte("entry_date", addDays(t0, -30)),
  ]);
  const editor = canEdit(profile);
  const cur = project.currency;
  const manager = people.find((p) => p.id === project.manager_id);
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const health = projectHealth(project, stats);

  // ---- Taches ----
  const parents = new Set(tasks.filter((t) => t.parent_id).map((t) => t.parent_id!));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const leaves = tasks.filter((t) => !parents.has(t.id));
  const isLate = (t: Task) => t.status !== "done" && t.end_date < t0;
  const late = leaves.filter(isLate), blocked = leaves.filter((t) => t.status === "blocked"), done = leaves.filter((t) => t.status === "done");
  const taskItems = leaves.map((t) => ({ task: t, lot: t.parent_id ? byId.get(t.parent_id)?.name ?? "" : "", responsible: (t.responsible_id && who.get(t.responsible_id)) || t.responsible_role || "" }));

  // ---- Valeur acquise ----
  const excluded = excludedStatuses(lists.expense_status);
  const events: ProgressEvent[] = (history ?? []).map((h) => ({ taskId: h.record_id as string, at: String(h.changed_at).slice(0, 10), progress: Number((h.new_data as Record<string, unknown> | null)?.progress ?? 0) }));
  const evm = computeEvm(leaves, (expenses ?? []) as { amount: number; spent_on: string; status: string }[], excluded, events, Number(project.budget), project.start_date, project.end_date, t0);
  const weeks = evm.series.filter((p) => p.date <= t0).slice(-9);
  const spiTrend = weeks.map((p) => (p.pv > 0 && p.ev !== null ? p.ev / p.pv : null));
  const cpiTrend = weeks.map((p) => (p.ac && p.ev !== null ? p.ev / p.ac : null));
  const spiSt = indexStatus(evm.spi), cpiSt = indexStatus(evm.cpi);
  const lastProgress = (history ?? []).filter((h) => h.action !== "insert").slice(-1)[0]?.changed_at as string | undefined;
  const lastExpense = (expenses ?? []).map((e) => e.spent_on).sort().slice(-1)[0];
  const lastJournal = (journal ?? [])[0]?.entry_date as string | undefined;
  const staleDays = lastProgress ? daysBetween(String(lastProgress).slice(0, 10), t0) : null;

  // ---- Delais ----
  const ms = (milestones ?? []) as Milestone[];
  const msReached = ms.filter((m) => m.reached_on), msLate = ms.filter((m) => !m.reached_on && m.due_date < t0), msNext = ms.filter((m) => !m.reached_on && m.due_date >= t0).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const drift = baselineDrift(leaves);
  const cp = criticalPath(leaves);
  const cpLate = cp.chain.filter(isLate).length;
  const endGap = daysBetween(project.end_date, evm.forecastEnd);
  const span = Math.max(1, daysBetween(evm.plannedStart, [evm.plannedEnd, evm.forecastEnd, t0].reduce((m, d) => (d > m ? d : m))));
  const xPct = (d: string) => `${Math.min(100, Math.max(0, (daysBetween(evm.plannedStart, d) / span) * 100))}%`;

  // ---- Couts et achats ----
  const valid = (expenses ?? []).filter((e) => !excluded.has(e.status));
  const byStatus = new Map<string, number>(); for (const e of valid) byStatus.set(e.status, (byStatus.get(e.status) ?? 0) + Number(e.amount));
  const byCat = new Map<string, number>(); for (const e of valid) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const estimateGap = evm.bac - evm.envelope;

  // ---- Risques, problemes, changements ----
  type Cr = { id: string; title: string; status: string; requested_at: string; change_request_items: { old_end: string | null; new_end: string }[] | null };
  const crList = (crs ?? []) as unknown as Cr[];
  const pending = crList.filter((c) => c.status === "soumise").sort((a, b) => a.requested_at.localeCompare(b.requested_at));
  const approved = crList.filter((c) => c.status === "approuvee");
  const shifts = approved.flatMap((c) => (c.change_request_items ?? []).filter((i) => i.old_end).map((i) => daysBetween(i.old_end!, i.new_end)));
  const meanShift = shifts.length ? Math.round(shifts.reduce((a, b) => a + b, 0) / shifts.length) : 0;
  const oldestPending = pending[0] ? daysBetween(pending[0].requested_at.slice(0, 10), t0) : 0;

  // ---- Equipe : charge par responsable ----
  const load = new Map<string, { open: number; late: number }>();
  for (const i of taskItems) { if (i.task.status === "done") continue; const k = i.responsible || "Non attribue"; const v = load.get(k) ?? { open: 0, late: 0 }; v.open++; if (isLate(i.task)) v.late++; load.set(k, v); }
  const loadRows = [...load.entries()].sort((a, b) => b[1].open - a[1].open).slice(0, 6);
  const loadMax = Math.max(1, ...loadRows.map(([, v]) => v.open));

  // ---- Decisions a prendre (regles) ----
  const decisions: Decision[] = [];
  if (evm.cpi !== null && evm.cpi < 0.9) decisions.push({ tone: "alert", text: `CPI ${fmtIndex(evm.cpi)} : au rythme actuel le projet coutera ${shortMoney(evm.eac)}, soit ${shortMoney(Math.abs(evm.vac))} de plus que le BAC.`, action: "Reviser l'estimation ou reduire le perimetre", href: `/projects/${id}/budget` });
  if (evm.ac > evm.envelope && evm.envelope > 0) decisions.push({ tone: "alert", text: `Enveloppe approuvee depassee de ${shortMoney(evm.ac - evm.envelope)}.`, action: "Demander une rallonge ou arbitrer", href: `/projects/${id}/expenses` });
  if (evm.spi !== null && evm.spi < 0.9) decisions.push({ tone: "alert", text: `SPI ${fmtIndex(evm.spi)} : ${evm.delayDays} j de retard sur la reference, fin previsionnelle ${evm.forecastCapped ? "au-dela du" : "le"} ${formatDate(evm.forecastEnd)}.`, action: "Reaffecter des ressources ou renegocier l'echeance", href: `/projects/${id}/planning` });
  if (msLate.length) decisions.push({ tone: "alert", text: `${msLate.length} jalon${msLate.length > 1 ? "s" : ""} depasse${msLate.length > 1 ? "s" : ""} : ${msLate.map((m) => m.name).slice(0, 2).join(", ")}${msLate.length > 2 ? "…" : ""}.`, action: "Replanifier ou marquer atteint", href: `/projects/${id}/planning` });
  if (late.length >= 3) decisions.push({ tone: "warn", text: `${late.length} taches en retard${cpLate ? `, dont ${cpLate} sur le chemin critique` : ""}.`, action: "Traiter les taches en retard", href: `/projects/${id}/tasks` });
  if (blocked.length) decisions.push({ tone: "warn", text: `${blocked.length} tache${blocked.length > 1 ? "s" : ""} bloquee${blocked.length > 1 ? "s" : ""}.`, action: "Lever les blocages", href: `/projects/${id}/tasks` });
  if (pending.length && oldestPending >= 10) decisions.push({ tone: "warn", text: `${pending.length} demande${pending.length > 1 ? "s" : ""} de changement en attente, la plus ancienne depuis ${oldestPending} j.`, action: "Decider", href: `/projects/${id}/changes` });
  if (evm.cpi !== null && evm.cpi >= 0.9 && evm.tcpi !== null && evm.tcpi > 1.1) decisions.push({ tone: "warn", text: `TCPI ${fmtIndex(evm.tcpi)} : il faut produire ${fmtIndex(evm.tcpi)} F de valeur par franc restant pour tenir le BAC.`, action: "Surveiller les couts restants", href: `/projects/${id}/budget` });
  if (estimateGap > evm.envelope * 0.05 && evm.envelope > 0) decisions.push({ tone: "info", text: `Cout reconstitue des taches superieur de ${shortMoney(estimateGap)} a l'enveloppe approuvee (${pct(estimateGap, evm.envelope)} %).`, action: "Aligner l'enveloppe ou le contenu", href: `/projects/${id}/budget` });
  if (!evm.baselineFrozen && leaves.length) decisions.push({ tone: "info", text: "Reference non figee : les ecarts de delai ne peuvent pas etre mesures.", action: "Figer la reference", href: `/projects/${id}/settings` });
  if (staleDays !== null && staleDays > 14 && evm.actualPct < 100) decisions.push({ tone: "info", text: `Aucune mise a jour d'avancement depuis ${staleDays} j : les indices peuvent etre perimes.`, action: "Mettre a jour l'avancement", href: `/projects/${id}/tasks` });
  if ((incidents ?? 0) > 0) decisions.push({ tone: "info", text: `${incidents} incident${(incidents ?? 0) > 1 ? "s" : ""} au registre sur 30 jours.`, action: "Consulter le registre", href: `/projects/${id}/register` });

  const verdict = decisions.some((d) => d.tone === "alert") ? "Des decisions sont attendues" : decisions.some((d) => d.tone === "warn") ? "Points a surveiller" : "Projet dans les clous";
  const linkCls = "text-[10px] text-ink-muted hover:text-ink hover:underline";
  const pipeTotal = Math.max(1, evm.ac);
  const notStarted = evm.pv === 0;

  return (
    <>
      <ProjectHeader project={project} manager={manager} actions={editor ? <Link href={`/projects/${id}/settings#supprimer`} className="btn-ghost text-ink-faint hover:text-alert" title="Supprimer le projet (onglet Parametres)">Supprimer le projet</Link> : undefined} />
      <ProjectTabs id={id} canEdit={editor} />

      {/* Bandeau de decision */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-stretch">
        <section className="card card-pad min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[10.5px]">
            <span className={`dot ${HEALTH_DOT[health]}`} /><span className="font-bold text-ink">{HEALTH_LABELS[health]}</span><span className="text-ink-faint">·</span><span className="text-ink-muted">{verdict}</span>
            {project.description && <span className="ml-auto hidden max-w-[45%] truncate text-ink-faint md:inline" title={project.description}>{project.description}</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4 md:divide-x md:divide-line-hair [&>*+*]:md:pl-4">
            <Hero label="SPI · delais" value={fmtIndex(evm.spi)} status={notStarted ? "idle" : spiSt} hint={notStarted ? "Pas encore demarre" : evm.delayDays > 0 ? `${evm.delayDays} j de retard` : evm.delayDays < 0 ? `${-evm.delayDays} j d'avance` : "Dans les temps"} help="Indice de performance des delais = valeur acquise / valeur planifiee. 1 = conforme a la reference." trend={spiTrend} baseline={1} />
            <Hero label="CPI · couts" value={fmtIndex(evm.cpi)} status={evm.ac === 0 ? "idle" : cpiSt} hint={evm.ac === 0 ? "Aucune depense" : evm.cpi !== null ? `${fmtIndex(evm.cpi)} F de valeur par franc depense` : "—"} help="Indice de performance des couts = valeur acquise / cout reel. 1 = conforme au budget." trend={cpiTrend} baseline={1} />
            <Hero label="Avancement" value={`${Math.round(evm.actualPct)} %`} status={notStarted ? "idle" : evm.actualPct + 5 >= evm.plannedPct ? "ok" : evm.actualPct + 15 >= evm.plannedPct ? "warn" : "alert"} hint={`prevu ${Math.round(evm.plannedPct)} % · ${done.length}/${leaves.length} taches`} help="Avancement physique = valeur acquise / BAC, compare a l'avancement planifie = valeur planifiee / BAC." />
            <Hero label="Fin previsionnelle" value={`${evm.forecastCapped ? "> " : ""}${formatDate(evm.forecastEnd)}`} status={endGap <= 0 ? "ok" : endGap <= 30 ? "warn" : "alert"} hint={endGap > 0 ? `${evm.forecastCapped ? "plus de " : "+"}${endGap} j vs ${formatDate(project.end_date)}` : `echeance ${formatDate(project.end_date)} tenue`} help={`Fin previsionnelle = duree de reference / indice de performance des delais (echeancier acquis).${evm.forecastCapped ? " Projection plafonnee au double de la duree de reference : au rythme actuel, la fin n'est pas previsible." : ""}`} />
          </div>
        </section>
        <Card title={<>Decisions a prendre <span className="text-[10px] font-normal text-ink-faint">{decisions.length}</span></>}>
          {decisions.length === 0 ? <p className="text-[10.5px] text-ink-muted">Aucune decision urgente : indices dans les seuils, jalons tenus, aucune demande en attente.</p> : (
            <ul className="divide-y divide-line-light">
              {decisions.slice(0, 5).map((d, i) => (
                <li key={i} className="flex gap-2.5 py-2 text-[10.5px]">
                  <span className={`dot mt-1.5 ${d.tone === "alert" ? "bg-alert" : d.tone === "warn" ? "bg-warn-dot" : "bg-neutral-dot"}`} />
                  <div className="min-w-0 flex-1"><div className="text-ink-body">{d.text}</div><Link href={d.href} className="font-semibold text-ink hover:underline">{d.action} →</Link></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Courbe en S et chiffres EVM */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <Card title="Valeur acquise" action={<span className="text-[10px] text-ink-faint">{evm.historySince ? `historique d'avancement depuis le ${formatDate(evm.historySince)}` : "sans historique d'avancement"}{evm.baselineFrozen ? "" : " · reference non figee"}</span>}>
          <EvmChart points={evm.series} bac={evm.bac} envelope={evm.envelope} eac={evm.eac} forecastEnd={evm.forecastEnd} today={t0} currency={cur} />
        </Card>
        <Card title="Chiffres EVM" action={<Link href={`/projects/${id}/budget`} className={linkCls}>Detail du budget</Link>}>
          <div className="divide-y divide-line-light">
            <Row k="BAC · budget a l'achevement" sub="Somme des budgets des taches feuilles (reference de mesure)" v={formatMoney(evm.bac, cur)} strong />
            <Row k="PV · valeur planifiee" sub="Budget qui aurait du etre consomme a ce jour selon la reference" v={formatMoney(evm.pv, cur)} />
            <Row k="EV · valeur acquise" sub="Budget des taches pondere par leur avancement" v={formatMoney(evm.ev, cur)} />
            <Row k="AC · cout reel" sub="Depenses non annulees a ce jour" v={formatMoney(evm.ac, cur)} />
            <Row k="SV · ecart de delai" sub="EV − PV" v={<span className={evm.sv < 0 ? "text-ink" : ""}>{evm.sv >= 0 ? "+" : "−"}{formatMoney(Math.abs(evm.sv), cur)}</span>} />
            <Row k="CV · ecart de cout" sub="EV − AC" v={<>{evm.cv >= 0 ? "+" : "−"}{formatMoney(Math.abs(evm.cv), cur)}</>} />
            <Row k="EAC · cout final estime" sub="AC + (BAC − EV) / CPI" v={formatMoney(evm.eac, cur)} strong />
            <Row k="ETC · reste a depenser" sub="EAC − AC" v={formatMoney(evm.etc, cur)} />
            <Row k="VAC · ecart a l'achevement" sub="BAC − EAC" v={<>{evm.vac >= 0 ? "+" : "−"}{formatMoney(Math.abs(evm.vac), cur)}</>} />
            <Row k="TCPI · performance requise" sub="(BAC − EV) / (BAC − AC) : efficacite a tenir sur le reste" v={fmtIndex(evm.tcpi)} />
          </div>
          <p className="hint mt-3 border-t border-line-hair pt-2">
            {evm.ac === 0 ? "Aucune depense enregistree : les indices de cout seront disponibles des la premiere depense." : `Au rythme actuel, le projet coutera ${shortMoney(evm.eac)}, soit ${evm.vac >= 0 ? `${shortMoney(evm.vac)} de moins` : `${shortMoney(-evm.vac)} de plus`} que le BAC${evm.envelope > 0 && Math.abs(evm.envelope - evm.bac) / evm.bac > 0.02 ? ` et ${evm.eac <= evm.envelope ? `${shortMoney(evm.envelope - evm.eac)} de moins` : `${shortMoney(evm.eac - evm.envelope)} de plus`} que l'enveloppe approuvee` : ""}.`}
          </p>
        </Card>
      </div>

      {/* Domaines : delais, couts, risques */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Card title="Delais" action={<Link href={`/projects/${id}/planning`} className={linkCls}>Planning</Link>}>
          <div className="space-y-2 text-[10px]">
            <div><div className="mb-1 flex justify-between text-ink-muted"><span>Prevu a ce jour</span><span className="tabular-nums">{Math.round(evm.plannedPct)} %</span></div><div className="h-[6px] overflow-hidden rounded-xs bg-line-light"><div className="h-full bg-chart-1" style={{ width: `${Math.min(100, evm.plannedPct)}%` }} /></div></div>
            <div><div className="mb-1 flex justify-between text-ink-muted"><span>Realise</span><span className="tabular-nums">{Math.round(evm.actualPct)} %</span></div><div className="h-[6px] overflow-hidden rounded-xs bg-line-light"><div className="h-full bg-chart-2" style={{ width: `${Math.min(100, evm.actualPct)}%` }} /></div></div>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-ink-muted"><span>Jalons · {msReached.length}/{ms.length} atteints</span>{msNext && <span>prochain : {msNext.name} le {formatDate(msNext.due_date)}</span>}</div>
            <div className="relative h-6">
              <div className="absolute left-0 right-0 top-1/2 h-px bg-line" />
              <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-ink-faint" style={{ left: xPct(t0) }} title={`Aujourd'hui · ${formatDate(t0)}`} />
              {evm.forecastEnd !== project.end_date && <div className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-ink bg-surface" style={{ left: xPct(evm.forecastEnd) }} title={`Fin previsionnelle · ${formatDate(evm.forecastEnd)}`} />}
              <div className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ink" style={{ left: xPct(project.end_date) }} title={`Fin planifiee · ${formatDate(project.end_date)}`} />
              {ms.map((m) => <div key={m.id} className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${m.reached_on ? "bg-ok" : m.due_date < t0 ? "bg-alert" : "bg-chart-1"}`} style={{ left: xPct(m.due_date) }} title={`${m.name} · ${formatDate(m.due_date)}${m.reached_on ? " · atteint" : m.due_date < t0 ? " · depasse" : ""}`} />)}
            </div>
            <div className="mt-1 flex justify-between text-[9.5px] text-ink-faint"><span>{formatDate(evm.plannedStart)}</span><span>{formatDate([evm.plannedEnd, evm.forecastEnd].reduce((a, b) => (a > b ? a : b)))}</span></div>
          </div>
          <div className="mt-3 divide-y divide-line-light border-t border-line-hair">
            <Row k="Retard sur la reference" sub="Echeancier acquis : aujourd'hui − date a laquelle l'EV actuelle etait prevue" v={<span className="flex items-center gap-1.5">{evm.delayDays > 0 && <span className="dot bg-alert" />}{evm.delayDays > 0 ? `${evm.delayDays} j` : evm.delayDays < 0 ? `${-evm.delayDays} j d'avance` : "0 j"}</span>} />
            <Row k="Taches en retard" v={<span className="flex items-center gap-1.5">{late.length > 0 && <span className="dot bg-alert" />}{late.length} / {leaves.length}</span>} />
            <Row k="Derive de la reference" sub="Taches dont la fin s'ecarte de la date de reference" v={drift.drifting ? `${drift.drifting} tache${drift.drifting > 1 ? "s" : ""} · +${drift.meanLate} j en moyenne` : "aucune"} />
            <Row k="Chemin critique" sub="Chaine de taches liees la plus longue (non terminees)" v={cp.chain.length ? `${cp.chain.length} taches · ${cp.days} j${cpLate ? ` · ${cpLate} en retard` : ""}` : "aucun lien"} />
          </div>
          {cp.chain.length > 0 && <ul className="mt-2 space-y-1 text-[10px]">{cp.chain.slice(0, 4).map((t) => <li key={t.id} className="flex items-center gap-1.5 truncate"><span className={`dot ${isLate(t) ? "bg-alert" : "bg-neutral-dot"}`} /><span className="truncate text-ink-body">{t.wbs_code ? `${t.wbs_code} · ` : ""}{t.name}</span><span className="ml-auto shrink-0 tabular-nums text-ink-faint">{formatDate(t.end_date)}</span></li>)}{cp.chain.length > 4 && <li className="text-ink-faint">… {cp.chain.length - 4} autres</li>}</ul>}
        </Card>

        <Card title="Couts et achats" action={<Link href={`/projects/${id}/expenses`} className={linkCls}>Journal des depenses</Link>}>
          <div className="divide-y divide-line-light">
            <Row k="Enveloppe approuvee" v={formatMoney(evm.envelope, cur)} />
            <Row k="Cout reconstitue (BAC)" sub="Somme des budgets des taches" v={formatMoney(evm.bac, cur)} />
            <Row k="Ecart d'estimation" sub="BAC − enveloppe" v={<span className="flex items-center gap-1.5">{estimateGap > evm.envelope * 0.05 && <span className="dot bg-warn-dot" />}{estimateGap >= 0 ? "+" : "−"}{formatMoney(Math.abs(estimateGap), cur)}</span>} />
            <Row k="Consomme" sub="AC / enveloppe" v={`${pct(evm.ac, evm.envelope)} %`} />
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-ink-muted"><span>Chaine d&apos;engagement</span><span className="tabular-nums">{formatMoney(evm.ac, cur)}</span></div>
            {evm.ac === 0 ? <p className="text-[10px] text-ink-faint">Aucune depense enregistree.</p> : (
              <>
                <div className="flex h-2 gap-[2px] overflow-hidden rounded-[3px] bg-line-light">{PIPE.map((p) => (byStatus.get(p.value) ?? 0) > 0 && <div key={p.value} className={p.cls} style={{ width: `${((byStatus.get(p.value) ?? 0) / pipeTotal) * 100}%` }} title={`${labelOf(lists.expense_status, p.value)} · ${formatMoney(byStatus.get(p.value) ?? 0, cur)}`} />)}</div>
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                  {PIPE.filter((p) => (byStatus.get(p.value) ?? 0) > 0).map((p) => <li key={p.value} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-[2px] ${p.cls}`} /><span className="truncate text-ink-muted">{labelOf(lists.expense_status, p.value)}</span><span className="ml-auto tabular-nums text-ink">{shortMoney(byStatus.get(p.value) ?? 0)}</span></li>)}
                  {[...byStatus.keys()].filter((k) => !PIPE.some((p) => p.value === k)).map((k) => <li key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-line" /><span className="truncate text-ink-muted">{labelOf(lists.expense_status, k)}</span><span className="ml-auto tabular-nums text-ink">{shortMoney(byStatus.get(k) ?? 0)}</span></li>)}
                </ul>
              </>
            )}
          </div>
          {cats.length > 0 && <div className="mt-4"><div className="mb-1.5 text-[10px] text-ink-muted">Principales categories</div><ul className="space-y-1 text-[10px]">{cats.map(([c, v], i) => <li key={c} className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-[2px] ${SEQ[i]}`} /><span className="truncate text-ink-body">{labelOf(lists.expense_category, c)}</span><span className="mx-1 flex-1 border-b border-dotted border-line" /><span className="tabular-nums text-ink">{shortMoney(v)}</span><span className="w-9 shrink-0 text-right tabular-nums text-ink-muted">{pct(v, evm.ac)} %</span></li>)}</ul></div>}
        </Card>

        <Card title="Risques, problemes, changements" action={<Link href={`/projects/${id}/changes`} className={linkCls}>Registre des changements</Link>}>
          <div className="divide-y divide-line-light">
            <Row k="Incidents · 30 jours" sub="Registre des incidents" v={<span className="flex items-center gap-1.5">{(incidents ?? 0) > 0 && <span className="dot bg-warn-dot" />}{incidents ?? 0}</span>} />
            <Row k="Taches bloquees" v={<span className="flex items-center gap-1.5">{blocked.length > 0 && <span className="dot bg-alert" />}{blocked.length}</span>} />
            <Row k="Jalons depasses" v={<span className="flex items-center gap-1.5">{msLate.length > 0 && <span className="dot bg-alert" />}{msLate.length}</span>} />
            <Row k="Demandes de changement en attente" sub="Maitrise integree des changements" v={<span className="flex items-center gap-1.5">{pending.length > 0 && <span className={`dot ${oldestPending >= 10 ? "bg-alert" : "bg-warn-dot"}`} />}{pending.length}{pending.length ? ` · ${oldestPending} j` : ""}</span>} />
            <Row k="Changements approuves" sub="Decalage moyen de la reference sur les taches concernees" v={approved.length ? `${approved.length} · ${meanShift >= 0 ? "+" : ""}${meanShift} j` : "0"} />
          </div>
          {pending.length > 0 && <ul className="mt-2 space-y-1 text-[10px]">{pending.slice(0, 3).map((c) => <li key={c.id} className="flex items-center gap-1.5 truncate"><span className="dot bg-warn-dot" /><span className="truncate text-ink-body">{c.title}</span><span className="ml-auto shrink-0 text-ink-faint">{formatDate(c.requested_at.slice(0, 10))}</span></li>)}</ul>}
          <div className="mt-4 rounded-md border border-dashed border-line px-3 py-2 text-[10px] text-ink-faint">Registre des risques (probabilite × impact) : prevu en phase 2.</div>
        </Card>
      </div>

      {/* Equipe, fraicheur, taches a traiter */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Card title="Equipe et fraicheur des donnees" action={<Link href={`/projects/${id}/tasks`} className={linkCls}>Taches</Link>}>
          {loadRows.length === 0 ? <p className="text-[10.5px] text-ink-muted">Aucune tache ouverte.</p> : (
            <ul className="space-y-2 text-[10px]">
              {loadRows.map(([name, v]) => <li key={name}><div className="flex justify-between"><span className="truncate text-ink-body">{name}</span><span className="tabular-nums text-ink-muted">{v.open} ouverte{v.open > 1 ? "s" : ""}{v.late ? ` · ${v.late} en retard` : ""}</span></div><div className="mt-1 flex h-[5px] gap-[2px] overflow-hidden rounded-xs bg-line-light"><div className="bg-ink" style={{ width: `${((v.open - v.late) / loadMax) * 100}%` }} />{v.late > 0 && <div className="bg-alert" style={{ width: `${(v.late / loadMax) * 100}%` }} />}</div></li>)}
            </ul>
          )}
          <div className="mt-4 divide-y divide-line-light border-t border-line-hair">
            <Row k="Derniere mise a jour d'avancement" v={<span className="flex items-center gap-1.5">{staleDays !== null && staleDays > 14 && <span className="dot bg-warn-dot" />}{lastProgress ? relativeTime(String(lastProgress)) : "—"}</span>} />
            <Row k="Derniere depense" v={lastExpense ? formatDate(lastExpense) : "—"} />
            <Row k="Derniere entree de journal" v={lastJournal ? formatDate(lastJournal) : "—"} />
          </div>
        </Card>
        <Card className="lg:col-span-2" title={<>Taches a traiter <span className="text-[10px] font-normal text-ink-faint">{leaves.length}</span></>} action={<Link href={`/projects/${id}/tasks`} className={linkCls}>Liste complete</Link>}>
          <OverviewTasks items={taskItems} today={t0} projectId={id} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <MilestonesCard projectId={id} milestones={ms} canEdit={editor} defaultDate={project.end_date} />
        <Card title="Activite recente" action={<Link href={`/projects/${id}/history`} className={linkCls}>Historique complet</Link>}>
          {(audit ?? []).length === 0 ? <p className="text-[10.5px] text-ink-muted">Aucune activite enregistree.</p> : (
            <ul className="divide-y divide-line-light text-[10.5px]">
              {(audit as AuditEntry[]).map((e) => { const d = describeAudit(e, cur); return (
                <li key={e.id} className="flex gap-3 py-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sub text-[10px] font-semibold text-ink-muted">{((e.changed_by && who.get(e.changed_by)) || "?").slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><div className="truncate"><span className="font-semibold">{(e.changed_by && who.get(e.changed_by)) || "Systeme"}</span> {d.what}</div>{d.details.length > 0 && <div className="mt-0.5 truncate text-[10px] text-ink-muted">{d.details.join(" · ")}</div>}</div>
                  <div className="shrink-0 text-[10px] text-ink-faint" title={new Date(e.changed_at).toLocaleString("fr-FR")}>{relativeTime(e.changed_at)}</div>
                </li>); })}
            </ul>
          )}
        </Card>
        <Card title="Journal de terrain" action={<Link href={`/projects/${id}/journal`} className={linkCls}>Tout le journal</Link>}>
          {(journal ?? []).length === 0 ? <p className="text-[10.5px] text-ink-muted">Aucune entree.</p> : (
            <ul className="space-y-3 text-[10.5px]">{(journal as JournalEntry[]).map((e) => <li key={e.id}><div className="text-[10px] text-ink-muted">{formatDate(e.entry_date)} · {e.author_id ? who.get(e.author_id) : "—"}{e.location ? ` · ${e.location}` : ""}</div><p className="line-clamp-2">{e.content}</p></li>)}</ul>
          )}
        </Card>
      </div>
    </>
  );
}
