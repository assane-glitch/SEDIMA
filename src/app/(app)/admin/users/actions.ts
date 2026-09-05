"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["admin", "manager", "viewer", "field"];

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
}

export async function inviteUser(formData: FormData) {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/dashboard");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "viewer") as UserRole;
  if (!ROLES.includes(role)) redirect("/admin/users?error=Role+invalide");
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
      redirectTo: `${siteUrl()}/auth/callback?type=invite`,
    });
    if (error) redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) redirect("/admin/users?error=" + encodeURIComponent("Cle secrete Supabase absente de la configuration Vercel"));
    throw e;
  }
  revalidatePath("/admin/users");
  redirect(`/admin/users?ok=${encodeURIComponent(`Invitation envoyee a ${email}`)}`);
}

export async function setRole(formData: FormData) {
  const me = await requireProfile();
  if (me.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!ROLES.includes(role) || id === me.id) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/users");
}
