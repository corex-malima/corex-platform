import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getPageContext } from "@/config/dashboard";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  NavCard                                                           */
/* ------------------------------------------------------------------ */

export interface NavCardProps {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
  icon: ReactNode;
}

export function NavCard({ href, title, description, eyebrow, icon }: NavCardProps) {
  const page = getPageContext(href);

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-[24px] border border-border/70 bg-card/80 p-5 transition-all hover:border-border hover:bg-card hover:shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-[16px] border border-border/60 bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
        <div className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-muted-foreground">
          Activo
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground/70">
          {eyebrow}
        </p>
        <p className="text-base font-medium leading-tight">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        <p className="text-[10px] tracking-[0.14em] text-muted-foreground/60">
          {page.eyebrow}
        </p>
      </div>
      <ArrowRight className="size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  SectionHeader                                                     */
/* ------------------------------------------------------------------ */

export interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function SectionHeader({ icon, title, description }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[16px] border border-border/60 bg-muted text-foreground">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-medium leading-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
