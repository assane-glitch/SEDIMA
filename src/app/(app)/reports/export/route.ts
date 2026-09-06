import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getLists } from "@/lib/reference";
import { labelOf } from "@/lib/reference-types";
import { CATEGORY_LABELS, PROJECT_STATUS_LABELS, TASK_STATUS_LABELS, type Expense, type JournalEntry, type Milestone, type Profile, type Project, type ProjectStats, type RegisterEntry, type Task } from "@/lib/types";

const cell = (v: unknown) => { if (v === null || v === undefined) return ""; const s = typeof v === "number" ? String(v).replace(".", ",") : String(v); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");

/** Exports CSV (Excel, separateur ;) : taches, depenses, journal, registres, jalons, projets. */
export async function GET(req: Request) {
  const profile = await requireProfile();
  const url = new URL(req.url); const type = url.searchParams.get("type") ?? "tasks"; const pid = url.searchParams.get("project") || null;
  const supabase = await createClient();
  const lists = await getLists();
  const [{ data: projects }, { data: people }] = await Promise.all([supabase.from("projects").select("*").order("code"), supabase.from("profiles").select("id,email,full_name,role")]);
  const pmap = new Map(((projects ?? []) as Project[]).map((p) => [p.id, p]));
  const who = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p.full_name || p.email]));
  const code = (id: string) => pmap.get(id)?.code ?? "";
  let rows: unknown[][] = [];
  if (type === "tasks") {
    const { data } = await (pid ? supabase.from("tasks").select("*").eq("project_id", pid) : supabase.from("tasks").select("*")).order("project_id").order("sort_order");
    const all = (data ?? []) as Task[]; const byId = new Map(all.map((t) => [t.id, t]));
    rows = [["Projet", "WBS", "Lot", "Tache", "Statut", "Debut", "Fin", "Debut reel", "Fin reelle", "Ref. debut", "Ref. fin", "Avancement %", "Budget HTVA", "Douanes", "TVA", "Responsable", "Role", "Depend de", "Type de lien", "Decalage (sem.)", "Methode", "Confiance", "Notes"],
      ...all.map((t) => [code(t.project_id), t.wbs_code, t.parent_id ? byId.get(t.parent_id)?.name : "", t.name, TASK_STATUS_LABELS[t.status], t.start_date, t.end_date, t.actual_start, t.actual_end, t.baseline_start, t.baseline_end, t.progress, Number(t.budget), Number(t.customs ?? 0), Number(t.vat ?? 0), t.responsible_id ? who.get(t.responsible_id) : "", t.responsible_role, t.depends_on ? byId.get(t.depends_on)?.wbs_code ?? "" : "", t.link_type, t.lag_weeks, t.estimate_method, t.confidence, t.notes])];
  } else if (type === "expenses") {
    const { data } = await (pid ? supabase.from("expenses").select("*").eq("project_id", pid) : supabase.from("expenses").select("*")).order("spent_on");
    const { data: tasks } = await supabase.from("tasks").select("id,wbs_code,name"); const tm = new Map((tasks ?? []).map((t) => [t.id, t]));
    rows = [["Ref", "Projet", "Date", "Designation", "Montant", "Devise", "Fournisseur", "N° DA", "Categorie", "Statut", "Lot / tache", "Source", "Saisi par", "Saisi le"],
      ...((data ?? []) as Expense[]).map((e) => [e.ref, code(e.project_id), e.spent_on, e.description, Number(e.amount), pmap.get(e.project_id)?.currency, e.supplier, e.da_number, labelOf(lists.expense_category, e.category), labelOf(lists.expense_status, e.status), e.task_id ? `${tm.get(e.task_id)?.wbs_code ?? ""} ${tm.get(e.task_id)?.name ?? ""}`.trim() : "", e.source, e.created_by ? who.get(e.created_by) : "", e.created_at.slice(0, 16).replace("T", " ")])];
  } else if (type === "journal") {
    const { data } = await (pid ? supabase.from("journal_entries").select("*").eq("project_id", pid) : supabase.from("journal_entries").select("*")).order("entry_date");
    const { data: tasks } = await supabase.from("tasks").select("id,wbs_code,name"); const tm = new Map((tasks ?? []).map((t) => [t.id, t]));
    rows = [["Projet", "Date", "Tache", "Lieu", "Compte rendu", "Source", "Auteur", "Saisi le"], ...((data ?? []) as JournalEntry[]).map((e) => [code(e.project_id), e.entry_date, e.task_id ? `${tm.get(e.task_id)?.wbs_code ?? ""} ${tm.get(e.task_id)?.name ?? ""}`.trim() : "", e.location, e.content, e.source, e.author_id ? who.get(e.author_id) : "", e.created_at.slice(0, 16).replace("T", " ")])];
  } else if (type === "registers") {
    const { data } = await (pid ? supabase.from("register_entries").select("*").eq("project_id", pid) : supabase.from("register_entries").select("*")).order("entry_date");
    const keys = Array.from(new Set(((data ?? []) as RegisterEntry[]).flatMap((e) => Object.keys(e.data)))).sort();
    rows = [["Projet", "Date", "Type", ...keys, "Source", "Auteur", "Saisi le"], ...((data ?? []) as RegisterEntry[]).map((e) => [code(e.project_id), e.entry_date, labelOf(lists.register_type, e.register_type), ...keys.map((k) => e.data[k] ?? ""), e.source, e.author_id ? who.get(e.author_id) : "", e.created_at.slice(0, 16).replace("T", " ")])];
  } else if (type === "milestones") {
    const { data } = await (pid ? supabase.from("milestones").select("*").eq("project_id", pid) : supabase.from("milestones").select("*")).order("due_date");
    rows = [["Projet", "Jalon", "Echeance", "Atteint le", "Notes"], ...((data ?? []) as Milestone[]).map((m) => [code(m.project_id), m.name, m.due_date, m.reached_on, m.notes])];
  } else if (type === "projects") {
    const [{ data: stats }, { data: years }] = await Promise.all([supabase.from("project_stats").select("*"), supabase.from("project_budget_years").select("project_id,year,amount")]);
    const sm = new Map(((stats ?? []) as ProjectStats[]).map((s) => [s.project_id, s])); const ys = Array.from(new Set((years ?? []).map((y) => Number(y.year)))).sort();
    const list = ((projects ?? []) as Project[]).filter((p) => !pid || p.id === pid);
    rows = [["Code", "Projet", "Categorie", "Statut", "Chef de projet", "Site", "BU", "Debut", "Fin", "Budget", "Budget KPMG", "Cout reconstitue", "Engage", "Avancement %", "Taches", "Terminees", "En retard", ...ys.map(String)],
      ...list.map((p) => { const s = sm.get(p.id); return [p.code, p.name, CATEGORY_LABELS[p.category], PROJECT_STATUS_LABELS[p.status], (p.manager_id && who.get(p.manager_id)) || p.manager_name, p.site, p.business_unit, p.start_date, p.end_date, Number(p.budget), Number(p.budget_kpmg ?? 0), Number(s?.rebuilt_cost ?? 0), Number(s?.spent ?? 0), Number(s?.progress ?? 0), Number(s?.task_count ?? 0), Number(s?.done_count ?? 0), Number(s?.late_count ?? 0), ...ys.map((y) => Number((years ?? []).find((r) => r.project_id === p.id && Number(r.year) === y)?.amount ?? 0))]; })];
  } else return NextResponse.json({ error: "type inconnu" }, { status: 400 });
  const name = `sedima-${type}${pid ? "-" + (pmap.get(pid)?.code ?? "projet").toLowerCase() : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
  void profile;
  return new NextResponse(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` } });
}
