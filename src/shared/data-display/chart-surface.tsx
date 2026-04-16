import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/lib/utils";

export function ChartSurface({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden border-border/70 bg-card/92", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}
