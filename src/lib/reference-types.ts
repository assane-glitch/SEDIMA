// Types et helpers des listes de reference, utilisables cote client comme cote serveur.
export interface RefItem { value: string; label: string; meta: Record<string, unknown>; active: boolean; sort_order: number; id?: string }
export type ListKey = "expense_category" | "expense_status" | "register_type" | "estimate_method" | "confidence" | "responsible_role" | "doc_type";

export const LIST_LABELS: Record<ListKey, { label: string; hint: string }> = {
  expense_category: { label: "Categories de depense", hint: "Journal des depenses" },
  expense_status: { label: "Statuts de depense", hint: "DA emise, commandee, livree, facturee, payee, annulee. Le ton et l'exclusion du consomme se reglent dans les options" },
  register_type: { label: "Types de registre", hint: "Chaque type porte ses champs de saisie" },
  estimate_method: { label: "Methodes d'estimation", hint: "Fiche de tache" },
  confidence: { label: "Niveaux de confiance", hint: "Fiche de tache" },
  responsible_role: { label: "Roles responsables", hint: "Fiche de tache, lots" },
  doc_type: { label: "Types de document", hint: "Espace documents" },
};

// Valeurs de repli si la table est vide ou inaccessible
export const DEFAULT_LISTS: Record<ListKey, RefItem[]> = {
  expense_category: ["materiaux:Materiaux", "main_oeuvre:Main d'oeuvre", "equipement:Equipement", "transport:Transport", "services:Services", "etudes:Etudes", "general:General"].map((s, i) => { const [value, label] = s.split(":"); return { value, label, meta: {}, active: true, sort_order: i }; }),
  expense_status: [["da_emise", "DA emise", "neutral"], ["commandee", "Commandee", "info"], ["livree", "Livree", "info"], ["facturee", "Facturee", "warn"], ["payee", "Payee", "ok"], ["annulee", "Annulee", "alert"]].map(([value, label, tone], i) => ({ value, label, meta: { tone, excluded: value === "annulee" }, active: true, sort_order: i })),
  register_type: [],
  estimate_method: ["Devis fournisseur", "Contrat", "Ratio", "Avis d'expert"].map((v, i) => ({ value: v, label: v, meta: {}, active: true, sort_order: i })),
  confidence: ["Élevé", "Moyen", "Faible"].map((v, i) => ({ value: v, label: v, meta: {}, active: true, sort_order: i })),
  responsible_role: [],
  doc_type: ["photo:Photo", "plan:Plan", "contrat:Contrat", "facture:Facture", "rapport:Rapport", "autre:Autre"].map((s, i) => { const [value, label] = s.split(":"); return { value, label, meta: {}, active: true, sort_order: i }; }),
};

export type Lists = Record<ListKey, RefItem[]>;

export function labelOf(list: RefItem[], value: string) {
  return list.find((i) => i.value === value)?.label ?? value;
}
export function toneOf(list: RefItem[], value: string): "neutral" | "info" | "ok" | "warn" | "alert" {
  const t = list.find((i) => i.value === value)?.meta?.tone;
  return (typeof t === "string" ? t : "neutral") as "neutral" | "info" | "ok" | "warn" | "alert";
}
/** Statuts de depense exclus du budget consomme (ex. annulee). */
export function excludedStatuses(list: RefItem[]) {
  return new Set(list.filter((i) => i.meta?.excluded === true).map((i) => i.value));
}
export type RegisterField = { key: string; label: string; type: "text" | "number" };
export function registerFields(item: RefItem): RegisterField[] {
  const f = item.meta?.fields;
  return Array.isArray(f) ? (f as RegisterField[]) : [];
}
