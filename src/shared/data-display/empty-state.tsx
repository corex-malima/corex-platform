import { Users } from "lucide-react";

export function EmptyState({ label = "No hay datos para el periodo seleccionado." }: { label?: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-border bg-card/65 px-6 py-10 text-center text-muted-foreground">
      <Users className="size-8 opacity-35" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
