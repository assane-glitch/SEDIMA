import type { Project, ProjectStats } from "@/lib/types";
import { daysBetween, today } from "@/lib/format";

export type Health = "good" | "warn" | "bad" | "done" | "idle";

export const HEALTH_LABELS: Record<Health, string> = {
  good: "Dans les temps", warn: "A surveiller", bad: "En difficulte", done: "Termine", idle: "En preparation",
};
export const HEALTH_DOT: Record<Health, string> = {
  good: "bg-ink", warn: "bg-warn-dot", bad: "bg-alert", done: "bg-ok", idle: "bg-neutral-dot",
};
export const HEALTH_BADGE: Record<Health, "ok" | "warn" | "alert" | "neutral" | "info"> = {
  good: "ok", warn: "warn", bad: "alert", done: "info", idle: "neutral",
};

// Sante d'un projet : retards, budget consomme vs avancement, echeance.
export function projectHealth(p: Project, s?: ProjectStats | null): Health {
  if (p.status === "cloture") return "done";
  if (p.status === "plan" || p.status === "hors_perimetre") return "idle";
  if ((p.status === "cadrage" || p.status === "approuve") && Number(s?.spent ?? 0) === 0) return "idle";
  const t = today();
  const progress = Number(s?.progress ?? 0);
  const spent = Number(s?.spent ?? 0);
  const budget = Number(p.budget);
  const late = Number(s?.late_count ?? 0);
  const total = Math.max(1, daysBetween(p.start_date, p.end_date));
  const elapsed = Math.min(total, Math.max(0, daysBetween(p.start_date, t)));
  const expected = Math.round((elapsed / total) * 100);
  const overBudget = budget > 0 && spent > budget;
  const pastDeadline = p.end_date < t && progress < 100;
  if (overBudget || pastDeadline || late >= 3) return "bad";
  const burn = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  if (late > 0 || progress + 15 < expected || burn > progress + 20) return "warn";
  return "good";
}

export function daysLeft(p: Project) {
  return daysBetween(today(), p.end_date);
}
