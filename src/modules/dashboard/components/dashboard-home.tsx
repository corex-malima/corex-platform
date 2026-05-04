"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock3,
  LayoutDashboard,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import {
  buildDashboardHomeSections,
  buildDomainEntries,
  buildQuickAccessViews,
  buildSearchableText,
  type DashboardView,
} from "@/config/dashboard";
import {
  ModuleCard,
  ModuleList,
  ModuleResultLink,
  SectionTitle,
} from "@/modules/dashboard/components/dashboard-home-primitives";

type DashboardHomeProps = {
  allowedResources: string[];
  isSuperadmin: boolean;
};

const RECENT_MODULES_KEY = "corex:home:recent-modules";
const FAVORITE_MODULES_KEY = "corex:home:favorite-modules";

const SECTION_ICON = {
  analytics: LayoutDashboard,
  management: Settings2,
  administration: ShieldCheck,
};

export function DashboardHome({ allowedResources, isSuperadmin }: DashboardHomeProps) {
  const [query, setQuery] = useState("");
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);
  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>([]);

  const sections = useMemo(
    () => buildDashboardHomeSections(allowedResources, isSuperadmin),
    [allowedResources, isSuperadmin],
  );
  const quickAccess = useMemo(
    () => buildQuickAccessViews(allowedResources, isSuperadmin),
    [allowedResources, isSuperadmin],
  );
  const domainEntries = useMemo(
    () => buildDomainEntries(allowedResources, isSuperadmin),
    [allowedResources, isSuperadmin],
  );
  const allViews = useMemo(() => sections.flatMap((section) => section.views), [sections]);
  const viewByHref = useMemo(() => new Map(allViews.map((view) => [view.href, view])), [allViews]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setRecentHrefs(readStoredHrefs(RECENT_MODULES_KEY));
      setFavoriteHrefs(readStoredHrefs(FAVORITE_MODULES_KEY));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return allViews
      .filter((view) => buildSearchableText(view).includes(normalizedQuery))
      .slice(0, 8);
  }, [allViews, normalizedQuery]);

  const recentViews = recentHrefs
    .map((href) => viewByHref.get(href))
    .filter((view): view is DashboardView => Boolean(view))
    .slice(0, 6);
  const favoriteViews = favoriteHrefs
    .map((href) => viewByHref.get(href))
    .filter((view): view is DashboardView => Boolean(view))
    .slice(0, 6);

  function rememberModule(href: string) {
    setRecentHrefs((current) => {
      const next = [href, ...current.filter((storedHref) => storedHref !== href)].slice(0, 8);
      writeStoredHrefs(RECENT_MODULES_KEY, next);
      return next;
    });
  }

  function toggleFavorite(href: string) {
    setFavoriteHrefs((current) => {
      const next = current.includes(href)
        ? current.filter((storedHref) => storedHref !== href)
        : [href, ...current].slice(0, 8);
      writeStoredHrefs(FAVORITE_MODULES_KEY, next);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <section className="starter-panel rounded-[28px] border border-border/70 bg-card/86 p-6">
        <div className="flex flex-col gap-5">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] tracking-[0.12em] text-muted-foreground">
              <Sparkles className="size-3.5" />
              Centro de navegación
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-medium tracking-tight">Inicio</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Busca módulos, entra por dominio o abre tus accesos frecuentes desde el catálogo central de CoreX.
              </p>
            </div>
          </div>

          <div className="relative max-w-5xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar módulo, indicador, maestro, proceso o persona..."
              className="h-[52px] w-full rounded-[20px] border border-border/75 bg-background/85 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/35"
            />
          </div>
        </div>

        {normalizedQuery ? (
          <div className="mt-4 rounded-[22px] border border-border/70 bg-background/78 p-3">
            {searchResults.length ? (
              <div className="grid gap-2 md:grid-cols-2">
                {searchResults.map((view) => (
                  <ModuleResultLink
                    key={view.href}
                    view={view}
                    onOpen={() => rememberModule(view.href)}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-[18px] border border-dashed border-border/80 px-4 py-6 text-center text-sm text-muted-foreground">
                Sin coincidencias en los módulos disponibles para tu usuario.
              </p>
            )}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {sections.map((section) => {
          const Icon = SECTION_ICON[section.id];
          return (
            <Link
              key={section.id}
              href={`#${section.id}`}
              className="group rounded-[24px] border border-border/70 bg-card/82 p-5 transition-all hover:border-border hover:bg-card hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-11 items-center justify-center rounded-[17px] border border-border/60 bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-4" />
                </div>
                <span className="rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[10px] text-muted-foreground">
                  {section.views.length} módulos
                </span>
              </div>
              <div className="mt-4 space-y-1">
                <h3 className="text-base font-medium">{section.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{section.description}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <section id="quick-access" className="space-y-3">
        <SectionTitle title="Accesos rápidos" description="Máximo ocho entradas priorizadas desde el catálogo." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickAccess.map((view) => (
            <ModuleCard
              key={view.href}
              view={view}
              isFavorite={favoriteHrefs.includes(view.href)}
              onOpen={() => rememberModule(view.href)}
              onToggleFavorite={() => toggleFavorite(view.href)}
            />
          ))}
        </div>
      </section>

      <section id="domains" className="space-y-3">
        <SectionTitle title="Entrar por dominio" description="Accesos agrupados por dominio real y sección disponible." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {domainEntries.map((entry) => (
            <article key={entry.domain} className="rounded-[24px] border border-border/70 bg-card/80 p-5">
              <div className="space-y-1">
                <h3 className="text-base font-medium">{entry.domain}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {entry.links.map((link) => (
                  <Link
                    key={`${entry.domain}-${link.label}`}
                    href={link.href}
                    onClick={() => rememberModule(link.href)}
                    className="rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  >
                    {link.label} · {link.count}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <ModuleList
          title="Recientes"
          description="Últimos módulos abiertos en este navegador."
          emptyText="Todavía no hay módulos recientes."
          icon={<Clock3 className="size-4" />}
          views={recentViews}
          onOpen={rememberModule}
        />
        <ModuleList
          title="Favoritos"
          description="Accesos marcados para este navegador."
          emptyText="Marca favoritos desde los accesos rápidos."
          icon={<Star className="size-4" />}
          views={favoriteViews}
          onOpen={rememberModule}
        />
      </section>
    </div>
  );
}

function readStoredHrefs(key: string) {
  try {
    const rawValue = window.localStorage.getItem(key);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsedValue) ? parsedValue.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredHrefs(key: string, hrefs: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(hrefs));
  } catch {
    // LocalStorage is an enhancement; navigation must keep working if it is unavailable.
  }
}
