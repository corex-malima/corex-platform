import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

export function SectionPageShell({
  eyebrow,
  title,
  subtitle,
  icon,
  children,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-4", className)}>
      <Card className="starter-panel border-border/70 bg-card/86">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              {eyebrow ? (
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-medium tracking-normal">
                  {eyebrow}
                </Badge>
              ) : null}
              <div className="space-y-2">
                <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
                {subtitle ? <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
              </div>
            </div>
            {icon || actions ? (
              <div className="flex shrink-0 items-center gap-3">
                {actions}
                {icon ? (
                  <div className="rounded-full bg-slate-900/10 p-4 text-slate-700 dark:bg-slate-900/20 dark:text-white">
                    {icon}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">{children}</CardContent>
      </Card>
    </div>
  );
}
