"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (password.length < 8) redirect("/account/password?error=" + encodeURIComponent("8 caracteres minimum"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.auth.updateUser({ password, data: fullName ? { full_name: fullName } : undefined });
  if (error) redirect("/account/password?error=" + encodeURIComponent(error.message));
  if (fullName) await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  redirect("/dashboard");
}
