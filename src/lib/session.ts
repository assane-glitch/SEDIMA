import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Memoise par requete : le layout et la page appellent requireProfile sans refaire les appels.
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  // Verification locale du JWT (pas d'appel HTTP), puis une seule requete pour le profil.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id,email,full_name,role").eq("id", userId).single();
  if (!profile) redirect("/login?error=profile");
  return profile as Profile;
});

export function canEdit(p: Profile) {
  return p.role === "admin" || p.role === "manager";
}

export function canSubmit(p: Profile) {
  return p.role === "admin" || p.role === "manager" || p.role === "field";
}
