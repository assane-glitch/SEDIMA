export default function Loading() {
  return (
    <div className="mx-auto max-w-lg animate-pulse">
      <div className="mb-6 h-7 w-40 rounded bg-slate-200" />
      {[0, 1, 2].map((i) => <div key={i} className="mb-2 h-16 rounded-xl bg-slate-200" />)}
    </div>
  );
}
