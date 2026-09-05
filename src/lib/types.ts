export type UserRole = "admin" | "manager" | "viewer" | "field";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
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
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  manager_id: string | null;
}

export interface ProjectStats {
  project_id: string;
  budget: number;
  spent: number;
  task_count: number;
  done_count: number;
  progress: number;
  late_count: number;
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
