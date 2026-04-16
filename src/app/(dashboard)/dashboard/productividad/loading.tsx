export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-[24px] bg-muted" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-[24px] bg-muted" />
      <div className="h-96 animate-pulse rounded-[24px] bg-muted" />
    </div>
  );
}
