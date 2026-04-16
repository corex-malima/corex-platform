import { cn } from "@/lib/utils";

export function StandardTable({ className, children }: { className?: string; children: React.ReactNode }) {
  return <table className={cn("min-w-full text-sm", className)}>{children}</table>;
}

export function StandardTh({ className, align = "left", children }: { className?: string; align?: "left" | "right" | "center"; children: React.ReactNode }) {
  return (
    <th
      className={cn(
        "bg-background/95 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function StandardTd({ className, align = "left", children }: { className?: string; align?: "left" | "right" | "center"; children: React.ReactNode }) {
  return (
    <td
      className={cn(
        "px-4 py-3 whitespace-nowrap",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}
