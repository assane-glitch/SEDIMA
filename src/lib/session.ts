import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("id,email,full_name,role").eq("id", user.id).single();
  if (!data) redirect("/login?error=profile");
  return data as Profile;
}

export function canEdit(p: Profile) {
  return p.role === "admin" || p.role === "manager";
}

export function canSubmit(p: Profile) {
  return p.role === "admin" || p.role === "manager" || p.role === "field";
}
