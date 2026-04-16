import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/lib/utils";

const accentStyles = {
  default: "",
  success: "border-l-4 border-l-chart-success-bold",
  warning: "border-l-4 border-l-chart-warning",
  danger: "border-l-4 border-l-chart-danger",
} as const;

export type MetricTileAccent = keyof typeof accentStyles;

export function MetricTile({
  label,
  value,
  hint,
  accent = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: MetricTileAccent;
  className?: string;
}) {
  return (
    <Card className={cn("bg-card/90 border-border/70", accentStyles[accent], className)}>
      <CardContent className="px-4 py-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
