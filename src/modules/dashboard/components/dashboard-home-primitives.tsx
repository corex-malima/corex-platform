"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import type { DashboardView } from "@/config/dashboard";
import { cn } from "@/lib/utils";

export function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-sm font-medium leading-tight">{title}</h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function ModuleCard({
  view,
  isFavorite,
  onOpen,
  onToggleFavorite,
}: {
  view: DashboardView;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const Icon = view.icon;

  return (
    <article className="group rounded-[24px] border border-border/70 bg-card/80 p-5 transition-all hover:border-border hover:bg-card hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-[16px] border border-border/60 bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-4" />
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          className={cn(
            "rounded-full border border-border/70 p-2 text-muted-foreground transition-colors hover:text-foreground",
            isFavorite && "border-amber-300/70 bg-amber-100/70 text-amber-700",
          )}
          aria-label={isFavorite ? "Quitar favorito" : "Marcar favorito"}
        >
          <Star className={cn("size-3.5", isFavorite && "fill-current")} />
        </button>
      </div>
      <Link href={view.href} onClick={onOpen} className="mt-4 block space-y-1">
        <p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground/70">
          {view.eyebrow}
        </p>
        <h3 className="text-base font-medium leading-tight">{view.title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{view.summary}</p>
        <ArrowRight className="mt-3 size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </Link>
    </article>
  );
}

export function ModuleResultLink({ view, onOpen }: { view: DashboardView; onOpen: () => void }) {
  const Icon = view.icon;
  return (
    <Link
      href={view.href}
      onClick={onOpen}
      className="flex items-start gap-3 rounded-[18px] border border-border/60 bg-card/78 p-3 transition-colors hover:bg-card"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[14px] bg-muted">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{view.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{view.eyebrow}</p>
      </div>
    </Link>
  );
}

export function ModuleList({
  title,
  description,
  emptyText,
  icon,
  views,
  onOpen,
}: {
  title: string;
  description: string;
  emptyText: string;
  icon: ReactNode;
  views: DashboardView[];
  onOpen: (href: string) => void;
}) {
  return (
    <section className="rounded-[24px] border border-border/70 bg-card/80 p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[16px] border border-border/60 bg-muted text-foreground">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-medium leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {views.length ? (
          views.map((view) => (
            <ModuleResultLink
              key={`${title}-${view.href}`}
              view={view}
              onOpen={() => onOpen(view.href)}
            />
          ))
        ) : (
          <p className="rounded-[18px] border border-dashed border-border/80 px-4 py-6 text-center text-xs text-muted-foreground">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}
