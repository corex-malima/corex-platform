import type { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, Settings2, ShieldCheck, Sparkles } from "lucide-react";

import { buildDashboardHomeSections } from "@/config/dashboard";
import { getCurrentUserAccess } from "@/lib/api-auth";
import { NavCard, SectionHeader } from "@/shared/navigation/nav-card";

type HomeSectionIcon = "dashboard" | "gestion" | "administracion";

const SECTION_ICON = {
  dashboard: <LayoutDashboard className="size-4" />,
  gestion: <Settings2 className="size-4" />,
  administracion: <ShieldCheck className="size-4" />,
} satisfies Record<HomeSectionIcon, ReactNode>;

export default async function DashboardPage() {
  const access = await getCurrentUserAccess();
  const sections = access
    ? buildDashboardHomeSections(access.allowedResources, access.isSuperadmin)
    : [];

  return (
    <div className="space-y-6">
      <section className="starter-panel rounded-[24px] border border-border/70 bg-card/86 p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] tracking-[0.12em] text-muted-foreground">
              <Sparkles className="size-3.5" />
              Centro de navegacion
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-medium tracking-tight">Inicio</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Esta portada se construye desde el mismo catalogo central de modulos que alimenta sidebar, mobile y RBAC visible.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[360px]">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={`#${section.id}`}
                className="rounded-[16px] border border-border/70 bg-background/80 px-4 py-3 text-sm transition-colors hover:bg-muted/60"
              >
                <div className="text-[11px] tracking-[0.12em] text-muted-foreground">Ir a</div>
                <div className="mt-1 font-medium">{section.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-28 space-y-4">
          <SectionHeader
            icon={SECTION_ICON[section.id]}
            title={section.title}
            description={section.description}
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {section.views.map((view) => (
              <NavCard
                key={`${section.id}-${view.href}`}
                href={view.href}
                title={view.title}
                description={view.summary}
                eyebrow={view.eyebrow}
                icon={<view.icon className="size-4" />}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
