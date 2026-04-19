export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-64 animate-pulse rounded-[24px] bg-muted" />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="h-[520px] animate-pulse rounded-[24px] bg-muted" />
        <div className="h-[520px] animate-pulse rounded-[24px] bg-muted" />
      </div>
    </div>
  );
}
