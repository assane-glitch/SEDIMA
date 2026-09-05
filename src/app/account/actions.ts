"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateName(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length < 2) redirect("/account?error=" + encodeURIComponent("Nom trop court"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) redirect("/account?error=" + encodeURIComponent(error.message));
  await supabase.auth.updateUser({ data: { full_name: fullName } });
  revalidatePath("/", "layout");
  redirect("/account?ok=" + encodeURIComponent("Nom enregistre"));
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) redirect("/account?error=" + encodeURIComponent("8 caracteres minimum"));
  if (password !== confirm) redirect("/account?error=" + encodeURIComponent("Les deux mots de passe ne correspondent pas"));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/account?error=" + encodeURIComponent(error.message));
  redirect("/account?ok=" + encodeURIComponent("Mot de passe modifie"));
}
