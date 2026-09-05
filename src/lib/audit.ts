import type { AuditEntry } from "@/lib/types";
import { formatMoney } from "@/lib/format";

const TABLE_LABELS: Record<string, string> = {
  projects: "le projet", tasks: "la tache", milestones: "le jalon", expenses: "une depense",
  journal_entries: "une entree de journal", register_entries: "une entree de registre", documents: "un document",
};
const FIELD_LABELS: Record<string, string> = {
  name: "nom", status: "statut", progress: "avancement", budget: "budget", start_date: "debut", end_date: "fin",
  responsible_id: "responsable", manager_id: "chef de projet", amount: "montant", due_date: "echeance",
  reached_on: "atteint le", category: "categorie", description: "description", notes: "notes", content: "contenu",
  spent_on: "date", entry_date: "date", location: "lieu", doc_type: "type", currency: "devise", code: "code", sort_order: "ordre",
};

function val(v: unknown, field: string, currency = "XOF") {
  if (v === null || v === undefined || v === "") return "vide";
  if (field === "budget" || field === "amount") return formatMoney(Number(v), currency);
  if (field === "progress") return `${v} %`;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split("-").reverse().join("/");
  const s = String(v);
  return s.length > 40 ? s.slice(0, 40) + "…" : s;
}

export function describeAudit(e: AuditEntry, currency = "XOF"): { what: string; details: string[] } {
  const label = TABLE_LABELS[e.table_name] ?? e.table_name;
  const name = (e.new_data?.name ?? e.old_data?.name ?? e.new_data?.description ?? e.old_data?.description ?? "") as string;
  const suffix = name ? ` « ${name.length > 50 ? name.slice(0, 50) + "…" : name} »` : "";
  if (e.action === "insert") return { what: `a cree ${label}${suffix}`, details: [] };
  if (e.action === "delete") return { what: `a supprime ${label}${suffix}`, details: [] };
  const fields = (e.changed_fields ?? []).filter((f) => !["updated_at", "created_at", "sort_order"].includes(f));
  const details = fields.slice(0, 4).map((f) => `${FIELD_LABELS[f] ?? f} : ${val(e.old_data?.[f], f, currency)} → ${val(e.new_data?.[f], f, currency)}`);
  if (fields.length > 4) details.push(`et ${fields.length - 4} autre(s) champ(s)`);
  return { what: `a modifie ${label}${suffix}`, details };
}

export function relativeTime(iso: string) {
  const diff = (Date.now() - Date.parse(iso)) / 1000;
  if (diff < 60) return "a l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
