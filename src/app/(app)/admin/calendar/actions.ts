"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

function str(fd: FormData, k: string) { return String(fd.get(k) ?? "").trim(); }
async function admin() { const me = await requireProfile(); if (me.role !== "admin") redirect("/dashboard"); return me; }
function done(msg?: string, error?: string) {
  revalidatePath("/", "layout");
  redirect(`/admin/calendar${error ? `?error=${encodeURIComponent(error)}` : msg ? `?ok=${encodeURIComponent(msg)}` : ""}`);
}

/** Jours ouvres de la semaine (cases 1..7) et heures par jour. */
export async function saveCalendarSettings(fd: FormData) {
  await admin();
  const workDays = fd.getAll("work_day").map(Number).filter((n) => n >= 1 && n <= 7).sort((a, b) => a - b);
  const hours = Number(String(fd.get("hours_per_day") ?? "").replace(",", "."));
  if (workDays.length === 0) done(undefined, "Choisir au moins un jour ouvre");
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) done(undefined, "Heures par jour invalides (entre 0,5 et 24)");
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_settings").upsert({ id: 1, work_days: workDays, hours_per_day: hours, updated_at: new Date().toISOString() });
  if (error) done(undefined, error.message);
  done("Calendrier enregistre");
}

export async function addHoliday(fd: FormData) {
  await admin();
  const day = str(fd, "day"), label = str(fd, "label");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !label) done(undefined, "Date et libelle obligatoires");
  const supabase = await createClient();
  const { error } = await supabase.from("holidays").insert({ day, label, recurring: fd.get("recurring") === "on" });
  if (error) done(undefined, error.code === "23505" ? "Ce jour ferie existe deja" : error.message);
  done(`« ${label} » ajoute`);
}

export async function updateHoliday(fd: FormData) {
  await admin();
  const id = str(fd, "id"), day = str(fd, "day"), label = str(fd, "label");
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !label) done(undefined, "Date et libelle obligatoires");
  const supabase = await createClient();
  const { error } = await supabase.from("holidays").update({ day, label, recurring: fd.get("recurring") === "on" }).eq("id", id);
  if (error) done(undefined, error.message);
  done();
}

export async function deleteHoliday(fd: FormData) {
  await admin();
  const supabase = await createClient();
  await supabase.from("holidays").delete().eq("id", str(fd, "id"));
  done("Jour ferie supprime");
}
