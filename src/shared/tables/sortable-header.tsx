"use client";

import { ArrowDownUp, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export type SortableHeaderProps = {
  label: string;
  sortKey: string;
  activeSortKey: string;
  direction: SortDirection;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
};

export function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  align = "left",
  className,
}: SortableHeaderProps) {
  const isActive = sortKey === activeSortKey;

  const Icon = isActive
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowDownUp;

  return (
    <th
      className={cn(
        "border-b border-r border-border/70 bg-card px-3 py-3 font-semibold text-foreground",
        align === "right" && "text-right",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 hover:text-primary"
      >
        {label}
        <Icon className={cn("size-3.5", isActive ? "text-foreground" : "text-muted-foreground/50")} />
      </button>
    </th>
  );
}
