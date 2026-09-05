export type UserRole = "admin" | "manager" | "viewer" | "field";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type ProjectCategory = "oac_poussins" | "poulet_chair" | "oeufs_table" | "industriels" | "autres";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  category: ProjectCategory;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  manager_id: string | null;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  due_date: string;
  reached_on: string | null;
  notes: string;
}

export interface Document {
  id: string;
  project_id: string;
  task_id: string | null;
  name: string;
  doc_type: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  tags: string[];
  source: "web" | "mobile";
  uploaded_by: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  table_name: string;
  record_id: string;
  project_id: string | null;
  action: "insert" | "update" | "delete";
  changed_by: string | null;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
}

export const PROJECT_CATEGORIES: { value: ProjectCategory; label: string; icon: string }[] = [
  { value: "oac_poussins", label: "OAC & Poussins", icon: "/brand/poussin.png" },
  { value: "poulet_chair", label: "Poulet de chair", icon: "/brand/coq.png" },
  { value: "oeufs_table", label: "Oeufs de table", icon: "/brand/oeuf.png" },
  { value: "industriels", label: "Industriels", icon: "/brand/industry.png" },
  { value: "autres", label: "Autres", icon: "/brand/autres.png" },
];
export const CATEGORY_LABELS = Object.fromEntries(PROJECT_CATEGORIES.map((c) => [c.value, c.label])) as Record<ProjectCategory, string>;
export const CATEGORY_ICONS = Object.fromEntries(PROJECT_CATEGORIES.map((c) => [c.value, c.icon])) as Record<ProjectCategory, string>;

export const DOC_TYPES: { value: string; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "plan", label: "Plan" },
  { value: "contrat", label: "Contrat" },
  { value: "facture", label: "Facture" },
  { value: "rapport", label: "Rapport" },
  { value: "autre", label: "Autre" },
];

export interface ProjectStats {
  project_id: string;
  budget: number;
  spent: number;
  task_count: number;
  done_count: number;
  progress: number;
  late_count: number;
  milestone_count: number;
  milestone_reached: number;
  next_milestone: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  status: TaskStatus;
  start_date: string;
  end_date: string;
  progress: number;
  budget: number;
  responsible_id: string | null;
  sort_order: number;
  notes: string;
}

export interface Expense {
  id: string;
  project_id: string;
  task_id: string | null;
  amount: number;
  spent_on: string;
  category: string;
  description: string;
  source: "web" | "mobile";
  created_by: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  project_id: string;
  task_id: string | null;
  entry_date: string;
  content: string;
  location: string;
  source: "web" | "mobile";
  author_id: string | null;
  created_at: string;
}

export interface RegisterEntry {
  id: string;
  project_id: string;
  task_id: string | null;
  register_type: string;
  entry_date: string;
  data: Record<string, string | number | boolean>;
  source: "web" | "mobile";
  author_id: string | null;
  created_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  manager: "Chef de projet",
  viewer: "Lecteur",
  field: "Terrain",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "En preparation",
  active: "En cours",
  on_hold: "En pause",
  completed: "Termine",
  cancelled: "Annule",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "A faire",
  in_progress: "En cours",
  done: "Termine",
  blocked: "Bloque",
};

export const REGISTER_TYPES: { value: string; label: string; fields: { key: string; label: string; type: "text" | "number" }[] }[] = [
  { value: "presence", label: "Presence", fields: [{ key: "personnes", label: "Nombre de personnes", type: "number" }, { key: "equipe", label: "Equipe", type: "text" }] },
  { value: "materiel", label: "Materiel", fields: [{ key: "designation", label: "Designation", type: "text" }, { key: "quantite", label: "Quantite", type: "number" }, { key: "etat", label: "Etat", type: "text" }] },
  { value: "livraison", label: "Livraison", fields: [{ key: "fournisseur", label: "Fournisseur", type: "text" }, { key: "designation", label: "Designation", type: "text" }, { key: "quantite", label: "Quantite", type: "number" }] },
  { value: "incident", label: "Incident", fields: [{ key: "gravite", label: "Gravite (1-5)", type: "number" }, { key: "description", label: "Description", type: "text" }] },
];
