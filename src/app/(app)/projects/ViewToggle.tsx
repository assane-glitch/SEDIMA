import Link from "next/link";

export function ViewToggle({ view }: { view: "list" | "planning" | "budget" }) {
  const cls = (v: string) => `px-2.5 py-[3px] text-[10px] font-semibold ${view === v ? "bg-ink text-surface" : "bg-surface text-ink-body hover:bg-surface-sub"}`;
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-line">
      <Link href="/projects" className={cls("list")}>☰ Liste</Link>
      <Link href="/projects/planning" className={cls("planning")}>▤ Planning</Link>
      <Link href="/projects/budget" className={cls("budget")}>Σ Budget</Link>
    </div>
  );
}
