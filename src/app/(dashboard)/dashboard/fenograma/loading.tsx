export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-[24px] bg-muted" />
        ))}
      </div>
      <div className="h-[480px] animate-pulse rounded-[24px] bg-muted" />
    </div>
  );
}
