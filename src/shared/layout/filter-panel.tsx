import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FilterPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

const kpiColumnMap = {
  2: "grid gap-3 md:grid-cols-2",
  3: "grid gap-3 md:grid-cols-2 xl:grid-cols-3",
  4: "grid gap-3 md:grid-cols-2 xl:grid-cols-4",
  5: "grid gap-3 md:grid-cols-2 xl:grid-cols-5",
} as const;

export function KpiGrid({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  return <div className={cn(kpiColumnMap[columns], className)}>{children}</div>;
}

export function ChartSection({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}

export function DetailSection({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}
