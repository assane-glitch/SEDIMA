"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

function str(fd: FormData, k: string) { return String(fd.get(k) ?? "").trim(); }
async function admin() { const me = await requireProfile(); if (me.role !== "admin") redirect("/dashboard"); return me; }
function done(key: string, msg?: string) { revalidatePath("/", "layout"); redirect(`/admin/lists?list=${key}${msg ? `&ok=${encodeURIComponent(msg)}` : ""}`); }

export async function addItem(fd: FormData) {
  await admin();
  const key = str(fd, "list_key"), label = str(fd, "label");
  let value = str(fd, "value") || label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!key || !label) redirect(`/admin/lists?list=${key}&error=Libelle+manquant`);
  if (key === "estimate_method" || key === "confidence" || key === "responsible_role") value = label;
  const meta: Record<string, unknown> = {};
  if (key === "expense_status") { meta.tone = str(fd, "tone") || "neutral"; meta.excluded = fd.get("excluded") === "on"; }
  if (key === "register_type") meta.fields = parseFields(str(fd, "fields"));
  const supabase = await createClient();
  const { data: last } = await supabase.from("reference_lists").select("sort_order").eq("list_key", key).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("reference_lists").insert({ list_key: key, value, label, sort_order: (last?.sort_order ?? 0) + 10, meta });
  if (error) redirect(`/admin/lists?list=${key}&error=${encodeURIComponent(error.message)}`);
  done(key, `« ${label} » ajoute`);
}

export async function updateItem(fd: FormData) {
  await admin();
  const key = str(fd, "list_key"), id = str(fd, "id");
  const patch: Record<string, unknown> = { label: str(fd, "label") };
  const meta: Record<string, unknown> = {};
  if (key === "expense_status") { meta.tone = str(fd, "tone") || "neutral"; meta.excluded = fd.get("excluded") === "on"; patch.meta = meta; }
  if (key === "register_type") { meta.fields = parseFields(str(fd, "fields")); patch.meta = meta; }
  const supabase = await createClient();
  await supabase.from("reference_lists").update(patch).eq("id", id);
  done(key);
}

export async function toggleItem(fd: FormData) {
  await admin();
  const key = str(fd, "list_key"), id = str(fd, "id");
  const supabase = await createClient();
  await supabase.from("reference_lists").update({ active: str(fd, "active") === "1" }).eq("id", id);
  done(key);
}

export async function moveItem(fd: FormData) {
  await admin();
  const key = str(fd, "list_key"), id = str(fd, "id"), dir = str(fd, "dir") === "up" ? -1 : 1;
  const supabase = await createClient();
  const { data: items } = await supabase.from("reference_lists").select("id,sort_order").eq("list_key", key).order("sort_order").order("label");
  if (!items) return;
  const i = items.findIndex((x) => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) done(key);
  // Renumerotation complete pour eviter les egalites
  const order = items.map((x) => x.id); [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((oid, idx) => supabase.from("reference_lists").update({ sort_order: (idx + 1) * 10 }).eq("id", oid)));
  done(key);
}

export async function deleteItem(fd: FormData) {
  await admin();
  const key = str(fd, "list_key"), id = str(fd, "id");
  const supabase = await createClient();
  await supabase.from("reference_lists").delete().eq("id", id);
  done(key, "Valeur supprimee");
}

/** "cle:Libelle:number, cle2:Libelle 2" -> champs de registre */
function parseFields(s: string) {
  return s.split(",").map((x) => x.trim()).filter(Boolean).map((x) => {
    const [key, label, type] = x.split(":").map((y) => y.trim());
    return { key: key || label.toLowerCase(), label: label || key, type: type === "number" ? "number" : "text" };
  });
}
