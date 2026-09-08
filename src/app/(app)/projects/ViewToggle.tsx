import Link from "next/link";

export function ViewToggle({ view, fav = false }: { view: "list" | "planning" | "budget"; fav?: boolean }) {
  const q = fav ? "?fav=1" : "";
  const cls = (v: string) => `px-2.5 py-[3px] text-[10px] font-semibold ${view === v ? "bg-ink text-surface" : "bg-surface text-ink-body hover:bg-surface-sub"}`;
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-line">
      <Link href={`/projects${q}`} className={cls("list")}>☰ Liste</Link>
      <Link href={`/projects/planning${q}`} className={cls("planning")}>▤ Planning</Link>
      <Link href={`/projects/budget${q}`} className={cls("budget")}>Σ Budget</Link>
    </div>
  );
}
