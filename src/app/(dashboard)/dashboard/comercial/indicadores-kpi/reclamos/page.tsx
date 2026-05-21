import {
  createEmptyQualityClaimDashboardData,
  getClaimDashboardPlanData,
  type ClaimScopeFilter,
} from "@/lib/calidad-reclamos-dashboard";
import { ReclamosDashboardPage } from "@/modules/calidad/components/reclamos-dashboard-page";
import { loadProtectedPageData } from "@/modules/core/server-page";

export const dynamic = "force-dynamic";

type SearchParamsValue = string | string[] | undefined;

function parseScope(value: SearchParamsValue): ClaimScopeFilter {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === "quality" || normalized === "commercial") return normalized;
  return "all";
}

export default async function ComercialAnalyticsReclamosPageRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamsValue>>;
}) {
  const resolvedSearchParams: Record<string, SearchParamsValue> = await Promise.resolve(searchParams ?? {});
  const scope = parseScope(resolvedSearchParams.scope);

  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/comercial/indicadores-kpi/reclamos",
    loader: () => getClaimDashboardPlanData(scope),
    fallbackMessage: "No se pudo cargar el frente analitico de reclamos.",
    fallbackData: createEmptyQualityClaimDashboardData(scope),
  });

  return (
    <ReclamosDashboardPage
      initialData={data!}
      initialError={error}
      eyebrow="Analitica / Comercial / Indicadores & KPI / Reclamos"
      title="Reclamos"
      subtitle="Vista consolidada de todos los reclamos historicos, con lectura ejecutiva por estado, naturaleza, clientes y tipo de problema."
      scopeControls={[
        {
          label: "Todos",
          scope: "all",
          href: "/dashboard/comercial/indicadores-kpi/reclamos",
          active: scope === "all",
        },
        {
          label: "Calidad",
          scope: "quality",
          href: "/dashboard/comercial/indicadores-kpi/reclamos?scope=quality",
          active: scope === "quality",
        },
        {
          label: "Comercial",
          scope: "commercial",
          href: "/dashboard/comercial/indicadores-kpi/reclamos?scope=commercial",
          active: scope === "commercial",
        },
      ]}
    />
  );
}
