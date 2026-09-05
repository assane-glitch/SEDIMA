export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-7 w-64 rounded bg-slate-200" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-200" />)}
      </div>
      <div className="h-72 rounded-xl bg-slate-200" />
    </div>
  );
}
