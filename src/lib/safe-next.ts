/** N'accepte qu'un chemin interne (/dashboard, /projects/...) : pas de //hote, de schema ni de caractere douteux. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  const n = (next ?? "").trim();
  return /^\/(?![\/\\])[A-Za-z0-9_\-./?=&%]*$/.test(n) && !n.includes("@") ? n : fallback;
}
